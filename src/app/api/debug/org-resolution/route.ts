import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    if (process.env.DEBUG_WORKSPACE !== '1' && process.env.DEBUG_ORG !== '1') {
        return new NextResponse('Not Found', { status: 404 });
    }

    const cookieStore = await cookies();
    const cookieOrgId = cookieStore.get('app-org-id')?.value;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({
            error: 'Not authenticated',
            authError: authError?.message,
            cookieOrgId: cookieOrgId ? `${cookieOrgId.slice(0, 8)}...` : null
        });
    }

    // Trace decisions
    const trace: string[] = [];
    trace.push('Auth success: ' + user.email);

    // Trace decisions using Workspace Resolver (Node Runtime)
    try {
        const { getWorkspaceState } = await import('@/lib/auth/workspace-resolver');
        const workspace = await getWorkspaceState();

        return NextResponse.json({
            status: 'success',
            userId: user.id,
            email: user.email,
            cookieOrgId: cookieOrgId ? `${cookieOrgId.slice(0, 8)}...` : null,
            workspace,
            recommendedRoute: workspace.recommendedRoute,
            trace: [
                `Auth success: ${user.email}`,
                `Organization Count: ${workspace.organizationsCount}`,
                `Active Org ID: ${workspace.activeOrgId}`,
                `Is Auto-provisioned: ${workspace.isAutoProvisioned}`,
                `Recommended Route: ${workspace.recommendedRoute}`
            ]
        });
    } catch (e: any) {
        return NextResponse.json({
            status: 'error',
            error: e.message,
            trace
        }, { status: 500 });
    }
}
