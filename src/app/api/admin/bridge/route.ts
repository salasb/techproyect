import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { CockpitService } from "@/lib/superadmin/cockpit-service";

export const dynamic = 'force-dynamic';

/**
 * Superadmin Bridge: Sets the organization context and redirects.
 * Used for deep-linking from Global Cockpit to specific Org Settings.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const next = searchParams.get('next') || '/dashboard';

    if (!orgId) {
        return new Response("Missing orgId", { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(req.url)}`);
    }

    const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { role: true }
    });

    if (profile?.role !== 'SUPERADMIN') {
        return new Response("Unauthorized: Superadmin only bridge", { status: 403 });
    }

    // 1. Audit Switch
    await CockpitService.auditAdminAction(
        user.id,
        'SUPERADMIN_BRIDGE_USED',
        `Bridge to ${orgId} with destination ${next}`,
        orgId
    );

    // 2. Set Context Cookie
    const cookieStore = await cookies();
    cookieStore.set('app-org-id', orgId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 1 day for bridge session
        path: '/',
    });

    // 3. Update Profile current org
    await prisma.profile.update({
        where: { id: user.id },
        data: { organizationId: orgId }
    });

    // 4. Redirect
    redirect(next);
}
