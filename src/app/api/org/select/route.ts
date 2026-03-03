import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ORG_CONTEXT_COOKIE } from "@/lib/auth/constants";

export const dynamic = 'force-dynamic';

/**
 * Definitive Organization Selection API (v1.3)
 * FIX: Using __Host- prefix for maximum cookie stability.
 * FIX: Strict error mapping and detailed trace logging.
 */
export async function POST(req: Request) {
    const traceId = `SEL-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    try {
        // 1. Parse Input
        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error(`[OrgSelect][${traceId}] Failed to parse JSON body`);
            return NextResponse.json({ ok: false, code: 'INVALID_REQUEST', message: "Cuerpo de petición inválido.", traceId }, { status: 400 });
        }

        const { orgId } = body;
        if (!orgId) {
            return NextResponse.json({ ok: false, code: 'MISSING_ORG_ID', message: "ID de organización requerido.", traceId }, { status: 400 });
        }

        // 2. Validate Session
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.warn(`[OrgSelect][${traceId}] Session invalid or expired:`, authError?.message);
            return NextResponse.json({ ok: false, code: 'SESSION_EXPIRED', message: "Tu sesión ha expirado.", traceId }, { status: 401 });
        }

        console.log(`[OrgSelect][${traceId}] User: ${user.id}, Org: ${orgId}`);

        // 3. Validate Membership (Direct DB query)
        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { role: true }
        });

        const isSuperadmin = profile?.role === 'SUPERADMIN';
        
        if (!isSuperadmin) {
            const membership = await prisma.organizationMember.findFirst({
                where: { 
                    organizationId: orgId, 
                    userId: user.id,
                    status: 'ACTIVE'
                }
            });

            if (!membership) {
                console.warn(`[OrgSelect][${traceId}] Access denied: user has no active membership in ${orgId}`);
                return NextResponse.json({ ok: false, code: 'NO_MEMBERSHIP', message: "No tienes acceso a esta organización.", traceId }, { status: 403 });
            }
        }

        // 4. Persistence (Robust Cookie)
        // We use NextResponse.json() combined with .cookies.set for reliability
        const response = NextResponse.json({ 
            ok: true, 
            redirectTo: isSuperadmin ? '/admin' : '/dashboard',
            traceId 
        });

        // Set the __Host- cookie
        // Requirements: Secure=true, Path=/, No Domain
        response.cookies.set(ORG_CONTEXT_COOKIE, orgId, {
            path: '/',
            httpOnly: true,
            secure: true, 
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 1 week
        });

        // 5. Profile Sync (Fire and forget with safety)
        prisma.profile.update({
            where: { id: user.id },
            data: { organizationId: orgId }
        }).catch(err => console.error(`[OrgSelect][${traceId}] Background sync failed:`, err.message));

        console.log(`[OrgSelect][${traceId}] SUCCESS`);
        return response;

    } catch (error: any) {
        console.error(`[OrgSelect][${traceId}] UNEXPECTED_BACKEND_ERROR:`, error.message, error.stack);
        return NextResponse.json({ 
            ok: false, 
            code: 'INTERNAL_ERROR', 
            message: "No pudimos guardar tu contexto comercial. Reintenta.", 
            traceId 
        }, { status: 500 });
    }
}
