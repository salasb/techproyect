import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ORG_CONTEXT_COOKIE } from "@/lib/auth/constants";

export const dynamic = 'force-dynamic';

/**
 * Definitive Organization Selection API (v1.4)
 * FIX: Enhanced logging for trace SEL-T4ZP8.
 * FIX: Strict UUID validation.
 * FIX: Robust cookie persistence.
 */
export async function POST(req: Request) {
    const traceId = `SEL-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const isPreview = process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development';
    
    console.log(`[OrgSelect][${traceId}] Request received`);

    try {
        // 1. Parse Input with error handling
        let body;
        try {
            const text = await req.text();
            if (!text) throw new Error("Empty body");
            body = JSON.parse(text);
        } catch (e: any) {
            console.error(`[OrgSelect][${traceId}] Body parse error:`, e.message);
            return NextResponse.json({ 
                ok: false, 
                code: 'INVALID_REQUEST', 
                message: "Cuerpo de petición inválido.",
                traceId 
            }, { status: 400 });
        }

        const { orgId } = body;
        if (!orgId) {
            console.warn(`[OrgSelect][${traceId}] Missing orgId in body`);
            return NextResponse.json({ 
                ok: false, 
                code: 'MISSING_ORG_ID', 
                message: "No se proporcionó el ID de la organización.",
                traceId 
            }, { status: 400 });
        }

        // 2. UUID Validation (Hex format 8-4-4-4-12)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(orgId)) {
            console.warn(`[OrgSelect][${traceId}] Invalid UUID format: ${orgId}`);
            return NextResponse.json({ 
                ok: false, 
                code: 'INVALID_ORG_ID', 
                message: "El ID de organización proporcionado no es válido.",
                traceId 
            }, { status: 400 });
        }

        // 3. Validate Session
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.warn(`[OrgSelect][${traceId}] Auth failed:`, authError?.message);
            return NextResponse.json({ 
                ok: false, 
                code: 'SESSION_EXPIRED', 
                message: "Tu sesión ha expirado. Por favor inicia sesión de nuevo.",
                traceId 
            }, { status: 401 });
        }

        console.log(`[OrgSelect][${traceId}] User: ${user.id}, Org: ${orgId}`);

        // 4. Validate Identity & Membership (Direct DB query)
        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { role: true, id: true }
        });

        if (!profile) {
            console.error(`[OrgSelect][${traceId}] Profile not found for user ${user.id}`);
            return NextResponse.json({ 
                ok: false, 
                code: 'PROFILE_MISSING', 
                message: "Tu perfil de usuario no ha sido inicializado.",
                traceId 
            }, { status: 404 });
        }

        const isSuperadmin = profile.role === 'SUPERADMIN';
        
        if (!isSuperadmin) {
            const membership = await prisma.organizationMember.findFirst({
                where: { 
                    organizationId: orgId, 
                    userId: user.id,
                    status: 'ACTIVE'
                },
                select: { id: true }
            });

            if (!membership) {
                console.warn(`[OrgSelect][${traceId}] No active membership found for user ${user.id} in org ${orgId}`);
                return NextResponse.json({ 
                    ok: false, 
                    code: 'NO_MEMBERSHIP',
                    message: "No tienes una membresía activa en esta organización.",
                    traceId 
                }, { status: 403 });
            }
        }

        // 5. Success Preparation
        const referer = req.headers.get('referer');
        const redirectTo = isSuperadmin && referer?.includes('/admin') ? '/admin' : '/dashboard';
        
        // 6. Persistence (Robust Context v1.5)
        const { setActiveOrg } = await import("@/lib/auth/active-context");
        await setActiveOrg(user.id, orgId, "select");

        const response = NextResponse.json({ 
            ok: true, 
            redirectTo,
            traceId 
        });

        // 7. Sync Profile (Fire and forget with safety)
        prisma.profile.update({
            where: { id: user.id },
            data: { organizationId: orgId }
        }).catch(err => console.error(`[OrgSelect][${traceId}] Profile sync warning:`, err.message));

        console.log(`[OrgSelect][${traceId}] SUCCESS`);
        return response;

    } catch (error: any) {
        console.error(`[OrgSelect][${traceId}] CRITICAL_BACKEND_ERROR:`, error.message, error.stack);
        return NextResponse.json({ 
            ok: false, 
            code: 'INTERNAL_ERROR',
            message: "No pudimos guardar tu contexto comercial. Reintenta.",
            details: isPreview ? error.message : undefined,
            traceId 
        }, { status: 500 });
    }
}
