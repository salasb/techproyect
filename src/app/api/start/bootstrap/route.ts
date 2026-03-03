import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveOrg } from "@/lib/auth/active-context";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Bootstrap API (v1.1)
 * Fast, non-cached initial state for the Onboarding/Safe-Harbor UI.
 * Determines if we should auto-enter an org or show the picker.
 */
export async function GET(req: Request) {
    const traceId = `BST-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.warn(`[Bootstrap][${traceId}] Auth failed or session expired.`);
            return NextResponse.json({ 
                ok: false, 
                code: 'SESSION_EXPIRED',
                message: "Sesión expirada. Por favor reingresa.",
                traceId 
            }, { status: 401 });
        }

        // 1. Get Memberships (Direct from DB)
        const memberships = await prisma.organizationMember.findMany({
            where: { userId: user.id, status: 'ACTIVE' },
            include: { 
                organization: {
                    include: { subscription: { select: { status: true } } }
                }
            }
        });

        // 2. Get Active Context from DB (Source of Truth)
        const activeOrgId = await getActiveOrg(user.id);

        // 3. Transformation
        const orgs = memberships.map(m => ({
            id: m.organization.id,
            name: m.organization.name,
            planStatus: m.organization.subscription?.status || 'FREE'
        }));

        // Business Logic: should we automatically redirect?
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

        // Anti-Cache Headers (Strict)
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');

        return response;

    } catch (error: any) {
        console.error(`[Bootstrap][${traceId}] CRITICAL_ERROR:`, error.message, error.stack);
        return NextResponse.json({ 
            ok: false, 
            code: 'BOOTSTRAP_FAILED', 
            message: "Error técnico al cargar configuración.",
            traceId 
        }, { status: 500 });
    }
}
