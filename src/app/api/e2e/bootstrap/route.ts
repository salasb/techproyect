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
        const { role, email, password, additionalOrg } = body;

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

        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: targetEmail,
            password: targetPassword,
            email_confirm: true
        });

        if (createError) {
            if (createError.message.toLowerCase().includes('already registered') || createError.status === 422) {
                const existingProfile = await prisma.profile.findFirst({ where: { email: targetEmail } });
                if (!existingProfile) {
                    throw new Error("User exists in Auth but not in Profile.");
                }
                userId = existingProfile.id;

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
        let finalRole: MembershipRole = role === 'SUPERADMIN' ? MembershipRole.SUPERADMIN : MembershipRole.MEMBER;
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
        let additionalOrgId: string | null = null;

        if (role === 'ADMIN') {
            const orgName = `E2E Test Org (${crypto.randomBytes(2).toString('hex')})`;

            const existingMember = await prisma.organizationMember.findFirst({
                where: { userId: userId },
                include: { organization: true }
            });

            if (existingMember) {
                orgId = existingMember.organizationId;
            } else {
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

                await prisma.subscription.create({
                    data: {
                        organizationId: orgId,
                        status: 'ACTIVE',
                        seatLimit: 10,
                        planCode: 'E2E_PRO'
                    }
                });
            }

            // Always ensure profile points to THE organization to avoid multi-org selection hurdle
            await prisma.profile.update({
                where: { id: userId },
                data: { organizationId: orgId }
            });

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

            // If additionalOrg flag is true, create a second organization for the user
            if (additionalOrg) {
                const memberships = await prisma.organizationMember.findMany({
                    where: { userId: userId }
                });

                if (memberships.length < 2) {
                    const additionalOrgName = `E2E Second Org (${crypto.randomBytes(2).toString('hex')})`;
                    const secondOrg = await prisma.organization.create({
                        data: {
                            name: additionalOrgName,
                            OrganizationMember: {
                                create: {
                                    userId: userId,
                                    role: MembershipRole.OWNER
                                }
                            }
                        }
                    });
                    additionalOrgId = secondOrg.id;

                    await prisma.subscription.create({
                        data: {
                            organizationId: additionalOrgId,
                            status: 'ACTIVE',
                            seatLimit: 5,
                            planCode: 'E2E_BASIC'
                        }
                    });

                    const secondOrgCompany = await prisma.company.create({ data: { name: 'E2E Second Org Company', organizationId: additionalOrgId } });
                    await prisma.project.create({
                        data: {
                            id: crypto.randomUUID(),
                            name: 'E2E Second Org Project',
                            companyId: secondOrgCompany.id,
                            organizationId: additionalOrgId,
                            status: 'EN_CURSO',
                            stage: 'COTIZACION',
                            responsible: 'E2E Admin',
                            startDate: new Date(),
                            plannedEndDate: new Date()
                        }
                    });
                } else {
                    additionalOrgId = memberships.find(m => m.organizationId !== orgId)?.organizationId || null;
                }
            }
        }

        // 6. Audit Trail
        await prisma.auditLog.create({
            data: {
                userId,
                organizationId: orgId,
                action: 'BOOTSTRAP_E2E_USER_ENSURED',
                details: `E2E Bootstrap completado para el rol ${role}. AdditionalOrg: ${!!additionalOrg}`,
                userName: targetEmail
            }
        });

        return NextResponse.json({
            status: 'SUCCESS',
            bootstrap: {
                userId,
                email: targetEmail,
                role: role,
                activeOrgId: orgId,
                additionalOrgId: additionalOrgId
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
