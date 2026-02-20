import { createClient } from "@/lib/supabase/server";
import { getWorkspaceState } from "@/lib/auth/workspace-resolver";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    // Diagnóstico Dev-Safe protection
    if (process.env.DEBUG_WORKSPACE !== '1') {
        return NextResponse.json({ error: "Debug endpoint disabled" }, { status: 404 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Capture environment info
    const host = request.headers.get('host') || 'unknown';
    const origin = request.headers.get('origin') || 'unknown';
    const isVercelDeployment = host.endsWith('.vercel.app');

    // Attempt to extract Supabase Ref from URL safely
    let supabaseProjectRef = 'unknown';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (supabaseUrl) {
        const matches = supabaseUrl.match(/(?:https:\/\/)(.*?)(?:\.supabase\.co)/);
        if (matches && matches[1]) {
            supabaseProjectRef = matches[1];
        }
    }

    try {
        const workspace = await getWorkspaceState();

        // Basic user data
        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { id: true, organizationId: true }
        });

        // Memberships
        const memberships = await prisma.organizationMember.findMany({
            where: { userId: user.id },
            select: { organizationId: true }
        });

        const cookieStore = await cookies();
        const activeOrgFromCookie = cookieStore.get('app-org-id')?.value || null;

        let dbCounts = null;
        if (workspace.activeOrgId) {
            const projectsCount = await prisma.project.count({ where: { organizationId: workspace.activeOrgId } });
            const quotesCount = await prisma.quote.count({ where: { project: { organizationId: workspace.activeOrgId } } });
            const clientsCount = await prisma.client.count({ where: { organizationId: workspace.activeOrgId } });
            dbCounts = {
                projectsCount,
                quotesCount,
                clientsCount
            };
        }

        const debugInfo = {
            environment: {
                host,
                origin,
                deploymentType: isVercelDeployment ? 'preview/deployment' : 'production/local',
                supabaseProjectRef
            },
            userId: user.id,
            profile: {
                id: profile?.id || null,
                lastActiveOrgId: profile?.organizationId || null
            },
            workspace: {
                membershipsCount: memberships.length,
                orgIds: memberships.map(m => m.organizationId),
                activeOrgFromCookie,
                activeOrgResolved: workspace.activeOrgId
            },
            dbCounts
        };

        return NextResponse.json(debugInfo);
    } catch (error: any) {
        return NextResponse.json({
            error: "Failed to resolve workspace",
            details: error.message
        }, { status: 500 });
    }
}
