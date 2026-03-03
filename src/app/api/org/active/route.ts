import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ORG_CONTEXT_COOKIE } from "@/lib/auth/constants";

export const dynamic = 'force-dynamic';

/**
 * Verification API (v1.0)
 * Checks if the server currently sees a valid organization context.
 * Used by /start to prevent "stale context" bounces.
 */
export async function GET(req: Request) {
    const traceId = `VRF-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const isPreview = process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development';

    try {
        const cookieStore = await cookies();
        const orgId = cookieStore.get(ORG_CONTEXT_COOKIE)?.value;

        if (!orgId) {
            const response = NextResponse.json({ 
                ok: false, 
                code: 'NO_ORG_CONTEXT',
                message: "No hay una organización seleccionada en este entorno.",
                traceId 
            }, { status: 200 }); // Status 200 to allow client-side logic handling
            
            if (isPreview) response.headers.set('x-active-org', 'none');
            return response;
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ ok: false, code: 'UNAUTHORIZED', traceId }, { status: 401 });
        }

        // Validate Membership
        const membership = await prisma.organizationMember.findFirst({
            where: { 
                organizationId: orgId, 
                userId: user.id,
                status: 'ACTIVE'
            }
        });

        const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } });
        const isSuperadmin = profile?.role === 'SUPERADMIN';

        if (!membership && !isSuperadmin) {
            return NextResponse.json({ 
                ok: false, 
                code: 'NO_MEMBERSHIP',
                message: "No tienes acceso a la organización seleccionada.",
                traceId 
            }, { status: 403 });
        }

        const response = NextResponse.json({ 
            ok: true, 
            orgId,
            source: "cookie",
            isSuperadmin,
            traceId 
        });

        response.headers.set('Cache-Control', 'no-store, max-age=0');
        if (isPreview) response.headers.set('x-active-org', orgId);
        return response;

    } catch (error: any) {
        const response = NextResponse.json({ ok: false, code: 'INTERNAL_ERROR', details: error.message, traceId }, { status: 500 });
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }
}
