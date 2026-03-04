import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveOrg } from "@/lib/auth/active-context";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Bootstrap API (v1.7)
 * Frictionless initial state orquestrator.
 * ALWAYS returns JSON. Never redirects.
 */
export async function GET(req: Request) {
    const traceId = `BST-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const env = process.env.VERCEL_ENV || 'development';
    
    try {
        console.log(`[Bootstrap][${traceId}] Start. Env: ${env}`);

        // 0. Environment Check
        if (!process.env.DATABASE_URL) {
            console.error(`[Bootstrap][${traceId}] FATAL: DATABASE_URL missing.`);
            return NextResponse.json({ 
                ok: false, 
                code: 'ENV_MISSING_DATABASE_URL', 
                message: "Configuración de base de datos ausente (DATABASE_URL).",
                traceId 
            }, { status: 500 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        // 1. Session Check (Manual 401, NO Redirect)
        if (authError || !user) {
            console.warn(`[Bootstrap][${traceId}] Unauthorized or expired session.`);
            return NextResponse.json({ 
                ok: false, 
                code: 'SESSION_EXPIRED',
                message: "Tu sesión ha expirado.",
                traceId 
            }, { status: 401 });
        }

        // 2. Fetch Data
        const [memberships, activeOrgId] = await Promise.all([
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

        // 3. Transformation
        const orgs = memberships.map(m => ({
            id: m.organization.id,
            name: m.organization.name,
            planStatus: m.organization.subscription?.status || 'FREE'
        }));

        // 4. Decision Logic
        const isContextValid = activeOrgId && orgs.some(o => o.id === activeOrgId);
        const shouldAutoEnter = (orgs.length === 1 && !activeOrgId) || isContextValid;
        const targetOrgId = isContextValid ? activeOrgId : (orgs.length === 1 ? orgs[0].id : null);

        const response = NextResponse.json({
            ok: true,
            orgs,
            activeOrgId: targetOrgId,
            shouldAutoEnter: !!shouldAutoEnter,
            redirectTo: "/dashboard",
            traceId
        });

        // 5. Anti-Cache
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        return response;

    } catch (error: any) {
        console.error(`[Bootstrap][${traceId}] FAIL:`, {
            message: error.message,
            stack: error.stack
        });

        return NextResponse.json({ 
            ok: false, 
            code: 'BOOTSTRAP_FAILED', 
            message: "Error técnico en la inicialización.",
            details: env !== 'production' ? error.message : undefined,
            traceId 
        }, { status: 500 });
    }
}
