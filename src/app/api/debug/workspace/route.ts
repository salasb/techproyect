import { createClient } from "@/lib/supabase/server";
import { getWorkspaceState } from "@/lib/auth/workspace-resolver";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function GET() {
    // F) Diagnóstico Dev-Safe protection
    if (process.env.DEBUG_WORKSPACE !== '1') {
        return NextResponse.json({ error: "Debug endpoint disabled" }, { status: 404 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check - Only Superadmin can see this
    const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { id: true, role: true }
    });

    if ((profile?.role as string) !== 'SUPERADMIN') {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const workspace = await getWorkspaceState();

        // Fetch raw DB state for comparison
        const memberships = await prisma.organizationMember.findMany({
            where: { userId: user.id },
            include: { organization: true }
        });

        const cookieStore = await cookies();
        const activeOrgFromCookie = cookieStore.get('app-org-id')?.value || null;

        const debugInfo = {
            userId: user.id,
            profileId: profile?.id || null, // Ensure to get profile.id if available
            membershipsCount: memberships.length,
            orgIds: memberships.map(m => m.organizationId),
            activeOrgFromCookie,
            activeOrgResolved: workspace.activeOrgId,
            // Extra info
            timestamp: new Date().toISOString(),
            rawMemberships: memberships,
            resolvedWorkspace: workspace
        };

        return NextResponse.json(debugInfo);
    } catch (error: any) {
        return NextResponse.json({
            error: "Failed to resolve workspace",
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
