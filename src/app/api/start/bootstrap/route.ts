import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveOrg } from "@/lib/auth/active-context";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Bootstrap API (v1.2)
 * Robust initial state orquestrator.
 * Ensures JSON response and detailed error tracking.
 */
export async function GET(req: Request) {
    // Generate a stable trace ID for this request
    const traceId = `BST-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const env = process.env.VERCEL_ENV || 'development';
    
    try {
        console.log(`[Bootstrap][${traceId}] Starting bootstrap... Env: ${env}`);

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.warn(`[Bootstrap][${traceId}] Unauthorized access attempt.`);
            return NextResponse.json({ 
                ok: false, 
                code: 'SESSION_EXPIRED',
                message: "Tu sesión ha expirado. Por favor inicia sesión nuevamente.",
                traceId 
            }, { status: 401 });
        }

        // 1. Fetch Memberships
        // Direct DB query via Prisma (requires Node runtime)
        const memberships = await prisma.organizationMember.findMany({
            where: { userId: user.id, status: 'ACTIVE' },
            include: { 
                organization: {
                    include: { subscription: { select: { status: true } } }
                }
            }
        });

        // 2. Resolve Active Context
        const activeOrgId = await getActiveOrg(user.id);

        // 3. Prepare Data for UI
        const orgs = memberships.map(m => ({
            id: m.organization.id,
            name: m.organization.name,
            planStatus: m.organization.subscription?.status || 'FREE'
        }));

        const isContextValid = activeOrgId && orgs.some(o => o.id === activeOrgId);
        const shouldAutoEnter = (orgs.length === 1 && !activeOrgId) || isContextValid;
        const targetOrgId = isContextValid ? activeOrgId : (orgs.length === 1 ? orgs[0].id : null);

        console.log(`[Bootstrap][${traceId}] Success. User: ${user.email}, Orgs: ${orgs.length}, AutoEnter: ${shouldAutoEnter}`);

        const response = NextResponse.json({
            ok: true,
            orgs,
            activeOrgId: targetOrgId,
            shouldAutoEnter: !!shouldAutoEnter,
            redirectTo: "/dashboard",
            traceId
        });

        // Anti-Cache Headers
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');

        return response;

    } catch (error: any) {
        // Critical Error Logging
        console.error(`[Bootstrap][${traceId}] CRITICAL_FAILURE:`, {
            message: error.message,
            stack: error.stack,
            url: req.url,
            env
        });

        return NextResponse.json({ 
            ok: false, 
            code: 'BOOTSTRAP_FAILED', 
            message: "No pudimos conectar con el servidor de configuración. El servicio podría estar bajo mantenimiento.",
            traceId 
        }, { status: 500 });
    }
}
