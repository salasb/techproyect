import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveOrg } from "@/lib/auth/active-context";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Bootstrap API (v1.4)
 * Definitive initial state orquestrator.
 * NO REDIRECTS allowed here. Only JSON.
 */
export async function GET(req: Request) {
    const traceId = `BST-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const env = process.env.VERCEL_ENV || 'development';
    
    try {
        console.log(`[Bootstrap][${traceId}] Loading config. Env: ${env}`);

        // 0. Environment Check (Critical for Vercel Preview)
        if (!process.env.DATABASE_URL) {
            console.error(`[Bootstrap][${traceId}] FATAL: DATABASE_URL is missing.`);
            return NextResponse.json({ 
                ok: false, 
                code: 'ENV_MISSING_DATABASE_URL', 
                message: "Configuración de base de datos no encontrada en este entorno.",
                traceId 
            }, { status: 500 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.warn(`[Bootstrap][${traceId}] Unauthorized or session expired.`);
            return NextResponse.json({ 
                ok: false, 
                code: 'SESSION_EXPIRED',
                message: "Sesión no válida o expirada. Por favor reingresa.",
                traceId 
            }, { status: 401 });
        }

        // 1. Fetch Memberships & Orgs
        const memberships = await prisma.organizationMember.findMany({
            where: { userId: user.id, status: 'ACTIVE' },
            include: { 
                organization: {
                    include: { subscription: { select: { status: true } } }
                }
            }
        });

        // 2. Resolve Active Context from DB
        const activeOrgId = await getActiveOrg(user.id);

        // 3. Map for UI
        const orgs = memberships.map(m => ({
            id: m.organization.id,
            name: m.organization.name,
            planStatus: m.organization.subscription?.status || 'FREE'
        }));

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

        // Force no-cache
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');

        return response;

    } catch (error: any) {
        console.error(`[Bootstrap][${traceId}] BOOTSTRAP_CRASH:`, {
            message: error.message,
            stack: error.stack
        });

        return NextResponse.json({ 
            ok: false, 
            code: 'BOOTSTRAP_FAILED', 
            message: "Fallo crítico al conectar con el servidor central.",
            traceId 
        }, { status: 500 });
    }
}
