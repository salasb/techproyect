import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * Robust Organization Selection API (v1.0)
 * Logic:
 * 1. Validate session.
 * 2. Validate membership (or superadmin).
 * 3. Set host-only cookie.
 * 4. Return success JSON for client-side navigation.
 */
export async function POST(req: Request) {
    const traceId = Math.random().toString(36).substring(7).toUpperCase();
    const isPreview = process.env.VERCEL_ENV === 'preview';
    
    try {
        const { orgId } = await req.json();
        
        if (!orgId) {
            return NextResponse.json({ ok: false, error: "Missing orgId" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
        }

        // 1. Validate Membership
        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { role: true }
        });

        const isSuperadmin = profile?.role === 'SUPERADMIN';
        
        if (!isSuperadmin) {
            const membership = await prisma.organizationMember.findUnique({
                where: { 
                    organizationId_userId: { 
                        organizationId: orgId, 
                        userId: user.id 
                    },
                    status: 'ACTIVE'
                }
            });

            if (!membership) {
                console.warn(`[OrgSelect][${traceId}] User ${user.email} tried to access org ${orgId} without membership.`);
                return NextResponse.json({ 
                    ok: false, 
                    error: "No tienes acceso a esta organización.",
                    reason: "membership_missing" 
                }, { status: 403 });
            }
        }

        // 2. Persist Context (Cookie)
        const cookieStore = await cookies();
        
        // Host-only cookie (no domain set)
        cookieStore.set('app-org-id', orgId, {
            path: '/',
            httpOnly: false,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            domain: undefined
        });

        // 3. Sync Profile
        await prisma.profile.update({
            where: { id: user.id },
            data: { organizationId: orgId }
        });

        console.log(`[OrgSelect][${traceId}] Success for Org ${orgId}. isSuperadmin: ${isSuperadmin}`);

        const redirectTo = isSuperadmin && !orgId ? '/admin' : '/dashboard';

        const response = NextResponse.json({ 
            ok: true, 
            redirectTo,
            traceId 
        });

        // Debug headers
        response.headers.set('x-org-select', 'ok');
        response.headers.set('x-org-select-reason', isSuperadmin ? 'superadmin_bypass' : 'membership_verified');

        return response;

    } catch (error: any) {
        console.error(`[OrgSelect][${traceId}] FATAL:`, error.message);
        return NextResponse.json({ 
            ok: false, 
            error: "Error interno al procesar la selección.",
            details: error.message 
        }, { status: 500 });
    }
}
