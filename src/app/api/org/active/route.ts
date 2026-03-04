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
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ ok: false, code: 'UNAUTHORIZED', traceId }, { status: 401 });
        }

        const { getActiveOrg } = await import("@/lib/auth/active-context");
        const orgId = await getActiveOrg(user.id);

        if (!orgId) {
            const response = NextResponse.json({ 
                ok: false, 
                code: 'NO_ORG_CONTEXT',
                message: "No hay una organización seleccionada.",
                traceId 
            }, { status: 200 });
            
            if (isPreview) response.headers.set('x-active-org', 'none');
            response.headers.set('Cache-Control', 'no-store');
            return response;
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

        // Rehydrate Cookie if missing (Server Action / Route Handler context)
        const cookieStore = await cookies();
        if (!cookieStore.has(ORG_CONTEXT_COOKIE)) {
            console.log(`[OrgActive][${traceId}] Rehydrating cookie for ${user.id} -> ${orgId}`);
            cookieStore.set(ORG_CONTEXT_COOKIE, orgId, {
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7
            });
        }

        const response = NextResponse.json({ 
            ok: true, 
            orgId,
            source: cookieStore.has(ORG_CONTEXT_COOKIE) ? "cookie" : "db",
            isSuperadmin,
            traceId 
        });

        response.headers.set('Cache-Control', 'no-store, max-age=0');
        if (isPreview) {
            response.headers.set('x-active-org', orgId);
            response.headers.set('x-active-source', cookieStore.has(ORG_CONTEXT_COOKIE) ? "cookie" : "db");
        }
        return response;

    } catch (error: any) {
        console.error(`[OrgActive][${traceId}] FATAL:`, error.message, error.code);
        const response = NextResponse.json({ 
            ok: false, 
            code: error.code ? 'DB_ERROR' : 'INTERNAL_ERROR', 
            prismaCode: error.code,
            details: error.message, 
            traceId 
        }, { status: 500 });
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }
}
