import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveOrg } from "@/lib/auth/active-context";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Ensure Node.js runtime for Prisma stability

/**
 * Bootstrap API (v1.5)
 * Canonical initial state orquestrator.
 * NO REDIRECTS allowed here. Always JSON.
 */
export async function GET(req: Request) {
    const traceId = `BST-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const env = process.env.VERCEL_ENV || 'development';
    
    try {
        console.log(`[Bootstrap][${traceId}] Fetching state. Env: ${env}`);

        // 0. Environment Check (Critical for Vercel Preview)
        if (!process.env.DATABASE_URL) {
            console.error(`[Bootstrap][${traceId}] ERROR: DATABASE_URL missing.`);
            return NextResponse.json({ 
                ok: false, 
                code: 'ENV_MISSING_DATABASE_URL', 
                message: "Falta configuración de base de datos en este entorno.",
                traceId 
            }, { status: 500 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        // 1. Session Check (Manual 401, NO Redirect)
        if (authError || !user) {
            console.warn(`[Bootstrap][${traceId}] Unauthorized:`, authError?.message);
            return NextResponse.json({ 
                ok: false, 
                code: 'SESSION_EXPIRED',
                message: "Tu sesión ha expirado o no es válida.",
                traceId 
            }, { status: 401 });
        }

        // 2. Fetch Memberships & Active Context (DB Source of Truth)
        const [memberships, activeOrgId] = await Promise.all([
            prisma.organizationMember.findMany({
                where: { userId: user.id, status: 'ACTIVE' },
                include: { 
                    organization: {
                        include: { subscription: { select: { status: true } } }
                    }
                }
            }),
            getActiveOrg(user.id)
        ]);

        // 3. Transformation & Auto-enter Logic
        const orgs = memberships.map(m => ({
            id: m.organization.id,
            name: m.organization.name,
            planStatus: m.organization.subscription?.status || 'FREE'
        }));

        const isContextValid = activeOrgId && orgs.some(o => o.id === activeOrgId);
        
        // Auto-enter if only 1 org or valid previous context
        const shouldAutoEnter = (orgs.length === 1 && !activeOrgId) || isContextValid;
        const targetOrgId = isContextValid ? activeOrgId : (orgs.length === 1 ? orgs[0].id : null);

        console.log(`[Bootstrap][${traceId}] Success. User: ${user.email}, Orgs: ${orgs.length}`);

        const response = NextResponse.json({
            ok: true,
            orgs,
            activeOrgId: targetOrgId,
            shouldAutoEnter: !!shouldAutoEnter,
            redirectTo: "/dashboard",
            traceId
        });

        // 4. Anti-Cache Headers
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');

        return response;

    } catch (error: any) {
        console.error(`[Bootstrap][${traceId}] UNEXPECTED_CRASH:`, {
            message: error.message,
            stack: error.stack
        });

        return NextResponse.json({ 
            ok: false, 
            code: 'BOOTSTRAP_FAILED', 
            message: "Fallo técnico en la orquestación inicial.",
            traceId 
        }, { status: 500 });
    }
}
