import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { MembershipRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    // 1. Core Security Guard Rails
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
        console.error("E2E Bootstrap: Blocked in production.");
        return NextResponse.json({ error: 'Endpoint deshabilitado en este entorno' }, { status: 403 });
    }

    const authHeader = req.headers.get('authorization');
    const secretToken = process.env.E2E_TEST_SECRET || 'E2E_LOCAL_TEST_SECRET';

    if (!secretToken || authHeader !== `Bearer ${secretToken}`) {
        console.error("E2E Bootstrap: Unauthorized access attempt.");
        return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { role, email, password } = body;

        if (!role || !['SUPERADMIN', 'ADMIN'].includes(role)) {
            return NextResponse.json({ error: 'Rol inválido o faltante' }, { status: 400 });
        }

        const targetEmail = email || `e2e_${role.toLowerCase()}@test.com`;
        const targetPassword = password || 'E2eTest1234!';

        console.log(`E2E Bootstrap: Asegurando identidad y entorno para ${targetEmail} (Rol: ${role})`);

        // 2. Initialize Supabase Admin Client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurada en el entorno.");
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 3. Ensure Auth User (Idempotent)
        let userId: string;

        // Try to create the user directly to bypass listUsers() which can return 500
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: targetEmail,
            password: targetPassword,
            email_confirm: true
        });

        if (createError) {
            if (createError.message.toLowerCase().includes('already registered') || createError.status === 422) {
                // User exists. Resolve ID through Prisma profile (created in previous test runs)
                const existingProfile = await prisma.profile.findFirst({ where: { email: targetEmail } });
                if (!existingProfile) {
                    throw new Error("User exists in Auth but not in Profile. Could not resolve ID because listUsers() is failing.");
                }
                userId = existingProfile.id;

                // Force update password to guarantee access
                const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                    password: targetPassword,
                    email_confirm: true
                });
                if (updateError) throw new Error(`Error actualizando password auth: ${updateError.message}`);
            } else {
                throw new Error(`Error creando usuario auth: ${createError.message}`);
            }
        } else {
            userId = createData.user.id;
        }

        // 4. Ensure Application Profile (Prisma)
        let finalRole: MembershipRole = role === 'SUPERADMIN' ? MembershipRole.SUPERADMIN : MembershipRole.MEMBER; // Canónico a DB
        await prisma.profile.upsert({
            where: { id: userId },
            update: { role: finalRole },
            create: {
                id: userId,
                email: targetEmail,
                name: `E2E ${role}`,
                role: finalRole
            }
        });

        // 5. Build Workspace if ADMIN
        let orgId: string | null = null;
        if (role === 'ADMIN') {
            const orgName = `E2E Test Org (${crypto.randomBytes(4).toString('hex')})`; // Evita colisiones si hay purgas parciales

            // Verificamos si ya pertenece a alguna organización comercial
            const existingMember = await prisma.organizationMember.findFirst({
                where: { userId: userId },
                include: { organization: true }
            });

            if (existingMember) {
                orgId = existingMember.organizationId;
            } else {
                // Generar nueva org
                const org = await prisma.organization.create({
                    data: {
                        name: orgName,
                        OrganizationMember: {
                            create: {
                                userId: userId,
                                role: MembershipRole.OWNER
                            }
                        }
                    }
                });
                orgId = org.id;

                // Optionally, add a canonical test subscription
                await prisma.subscription.create({
                    data: {
                        organizationId: orgId,
                        status: 'ACTIVE',
                        seatLimit: 10,
                        planCode: 'E2E_PRO'
                    }
                });

            }

            // Seed a canonical project to test C1 Multi-Org Isolation idempotently
            const existingCompany = await prisma.company.findFirst({ where: { name: 'E2E Isolated Company', organizationId: orgId } });
            const company = existingCompany || await prisma.company.create({ data: { name: 'E2E Isolated Company', organizationId: orgId } });

            const existingProject = await prisma.project.findFirst({ where: { name: 'E2E Seeded Project', organizationId: orgId } });
            if (!existingProject) {
                await prisma.project.create({
                    data: {
                        id: crypto.randomUUID(),
                        name: 'E2E Seeded Project',
                        companyId: company.id,
                        organizationId: orgId,
                        status: 'EN_CURSO',
                        stage: 'COTIZACION',
                        responsible: 'E2E Admin',
                        startDate: new Date(),
                        plannedEndDate: new Date()
                    }
                });
            }
        }

        // 6. Audit Trail
        await prisma.auditLog.create({
            data: {
                userId,
                organizationId: orgId,
                action: 'BOOTSTRAP_E2E_USER_ENSURED',
                details: `E2E Bootstrap completado para el rol ${role}`,
                userName: targetEmail
            }
        });

        // Retornamos sin secretos (solo metadata útil para los tests)
        return NextResponse.json({
            status: 'SUCCESS',
            bootstrap: {
                userId,
                email: targetEmail,
                role: role,
                activeOrgId: orgId
            }
        });

    } catch (error: any) {
        console.error("E2E Bootstrap Internal Error:", error);
        return NextResponse.json({
            status: 'ERROR',
            error: error.message
        }, { status: 500 });
    }
}
