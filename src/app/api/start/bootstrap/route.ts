import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveOrg } from "@/lib/auth/active-context";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Bootstrap API (v1.9)
 * Definitive initial state orchestrator.
 * Designed to NEVER return HTML and handle environment/Prisma issues gracefully.
 */
export async function GET(req: Request) {
    const traceId = `BST-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const env = process.env.VERCEL_ENV || 'development';
    const isPreview = env === 'preview' || process.env.NODE_ENV === 'development';
    
    try {
        const dbUrl = process.env.DATABASE_URL || '';
        const dbFingerprint = dbUrl.split('@')[1] || 'undefined';
        console.log(`[Bootstrap][${traceId}] Handshake start. Env: ${env} | SAFE_DB_FINGERPRINT: ${dbFingerprint}`);

        // 1. Session Check (Independent of DB)
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.warn(`[Bootstrap][${traceId}] Unauthorized: ${authError?.message || 'No user'}`);
            return NextResponse.json({ 
                ok: false, 
                code: 'SESSION_EXPIRED',
                message: "Tu sesión no es válida o ha expirado.",
                traceId 
            }, { status: 401 });
        }

        // 2. Database/Env Check
        if (!process.env.DATABASE_URL) {
            console.error(`[Bootstrap][${traceId}] ERROR: DATABASE_URL is undefined.`);
            return NextResponse.json({ 
                ok: false, 
                code: 'ENV_MISSING_DATABASE_URL', 
                message: "Configuración de base de datos faltante en este entorno.",
                traceId 
            }, { status: 500 });
        }

        // 3. Fetch Data (Prisma)
        let memberships = [];
        let activeOrgId = null;

        try {
            [memberships, activeOrgId] = await Promise.all([
                prisma.organizationMember.findMany({
                    where: { userId: user.id, status: 'ACTIVE' },
                    include: { 
                        organization: {
                            include: { subscription: { select: { status: true } } }
                        }
                    }
                }),
                getActiveOrg(user.id).catch(() => null)
            ]);
        } catch (dbError: any) {
            const safeDbUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@') : 'undefined';
            console.error(`[Bootstrap][${traceId}] Database access failed:`, dbError.message, dbError.code, "DB URL:", safeDbUrl, "Meta:", dbError.meta, "Stack:", dbError.stack);
            
            // Explicit check for Schema Mismatch (P2022: column missing, P2021: table missing)
            if (dbError.code === 'P2022' || dbError.code === 'P2021') {
                return NextResponse.json({
                    ok: false,
                    code: 'SCHEMA_MISMATCH',
                    prismaCode: dbError.code,
                    message: "La base de datos del entorno no tiene las columnas o tablas esperadas. Es necesario aplicar migraciones.",
                    details: isPreview ? dbError.message : undefined,
                    traceId
                }, { status: 500 });
            }

            return NextResponse.json({
                ok: false,
                code: 'DB_UNREACHABLE',
                prismaCode: dbError.code, // e.g. P1001
                message: "No pudimos conectar con la base de datos de organizaciones.",
                details: isPreview ? dbError.message : undefined,
                traceId
            }, { status: 500 });
        }

        // 4. Transformation
        const orgs = memberships.map(m => ({
            id: m.organization.id,
            name: m.organization.name,
            planStatus: m.organization.subscription?.status || 'FREE'
        }));

        // 5. Decision Logic
        const isContextValid = activeOrgId && orgs.some(o => o.id === activeOrgId);
        
        // Auto-enter logic (Internal handshake)
        // If we only have 1 org, we consider it the target.
        const shouldAutoEnter = (orgs.length === 1 && !activeOrgId) || isContextValid;
        const targetOrgId = isContextValid ? activeOrgId : (orgs.length === 1 ? orgs[0].id : null);

        console.log(`[Bootstrap][${traceId}] Success. Orgs: ${orgs.length}, Target: ${targetOrgId}`);

        const response = NextResponse.json({
            ok: true,
            orgs,
            activeOrgId: targetOrgId,
            shouldAutoEnter: !!shouldAutoEnter,
            redirectTo: "/dashboard",
            traceId
        });

        // Strict Anti-Cache
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');

        return response;

    } catch (error: any) {
        console.error(`[Bootstrap][${traceId}] FATAL_CRASH:`, error.message, error.stack);

        return NextResponse.json({ 
            ok: false, 
            code: 'BOOTSTRAP_FAILED', 
            message: "Fallo crítico en la inicialización del sistema.",
            details: isPreview ? error.message : undefined,
            traceId 
        }, { status: 500 });
    }
}
