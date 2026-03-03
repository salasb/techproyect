import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * Robust Organization Selection API (v1.2)
 * Optimized for Vercel Preview and App Router consistency.
 * 
 * FIX: Added strict UUID validation to prevent Prisma internal errors (500).
 * FIX: Improved cookie persistence using NextResponse.
 */
export async function POST(req: Request) {
    const traceId = `SEL-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const isPreview = process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development';
    
    try {
        const body = await req.json().catch(() => ({}));
        const { orgId } = body;
        
        if (!orgId) {
            return NextResponse.json({ 
                ok: false, 
                code: 'MISSING_ORG_ID', 
                message: "No se proporcionó el ID de la organización.",
                traceId 
            }, { status: 400 });
        }

        // UUID Validation (Prisma will throw 500 if invalid UUID is passed to a UUID field)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(orgId)) {
            return NextResponse.json({ 
                ok: false, 
                code: 'INVALID_ORG_ID', 
                message: "El ID de organización proporcionado no es válido.",
                traceId 
            }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.warn(`[OrgSelect][${traceId}] Auth failed:`, authError?.message);
            return NextResponse.json({ 
                ok: false, 
                code: 'UNAUTHORIZED', 
                message: "Tu sesión ha expirado. Por favor inicia sesión de nuevo.",
                traceId 
            }, { status: 401 });
        }

        // 1. Validate Identity & Membership
        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { role: true, id: true }
        });

        if (!profile) {
            return NextResponse.json({ 
                ok: false, 
                code: 'PROFILE_MISSING', 
                message: "Tu perfil de usuario no ha sido inicializado correctamente.",
                traceId 
            }, { status: 404 });
        }

        const isSuperadmin = profile.role === 'SUPERADMIN';
        
        if (!isSuperadmin) {
            // Use findFirst to avoid potential constraint name issues in different environments
            const membership = await prisma.organizationMember.findFirst({
                where: { 
                    organizationId: orgId, 
                    userId: user.id,
                    status: 'ACTIVE'
                }
            });

            if (!membership) {
                console.warn(`[OrgSelect][${traceId}] Access denied for user ${user.email} to org ${orgId}.`);
                return NextResponse.json({ 
                    ok: false, 
                    code: 'FORBIDDEN',
                    message: "No tienes una membresía activa en esta organización.",
                    traceId 
                }, { status: 403 });
            }
        }

        // 2. Prepare Success State
        const referer = req.headers.get('referer');
        const redirectTo = isSuperadmin && referer?.includes('/admin') ? '/admin' : '/dashboard';
        
        // 3. Persist Context (Cookie via NextResponse)
        const response = NextResponse.json({ 
            ok: true, 
            redirectTo,
            traceId 
        });

        // Set Host-Only Cookie (No Domain)
        // Note: Using standard name for compatibility, but enforcing host-only properties
        response.cookies.set('app-org-id', orgId, {
            path: '/',
            httpOnly: false, 
            sameSite: 'lax',
            secure: true, 
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        // 4. Sync Profile (Await with timeout to ensure DB consistency before responding)
        try {
            await Promise.race([
                prisma.profile.update({
                    where: { id: user.id },
                    data: { organizationId: orgId }
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout syncing profile")), 2000))
            ]);
        } catch (syncErr: any) {
            console.error(`[OrgSelect][${traceId}] Profile sync warning:`, syncErr.message);
            // We don't fail the whole request if sync lags, the cookie is the primary driver
        }

        // Debug headers
        if (isPreview) {
            response.headers.set('x-org-select-status', 'ok');
            response.headers.set('x-org-select-reason', isSuperadmin ? 'superadmin_bypass' : 'membership_verified');
            response.headers.set('x-trace-id', traceId);
        }

        console.log(`[OrgSelect][${traceId}] Success for ${user.email} -> ${orgId}`);
        return response;

    } catch (error: any) {
        console.error(`[OrgSelect][${traceId}] INTERNAL_ERROR:`, error.message, error.stack);
        return NextResponse.json({ 
            ok: false, 
            code: 'INTERNAL_ERROR',
            message: "No pudimos procesar tu selección. Por favor reintenta.",
            details: isPreview ? error.message : undefined,
            traceId 
        }, { status: 500 });
    }
}
