import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    if (process.env.DEBUG_ORG !== '1') {
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

    try {
        const [memberships, profile] = await Promise.all([
            prisma.organizationMember.findMany({
                where: { userId: user.id, status: 'ACTIVE' },
                select: { organizationId: true, role: true, status: true }
            }),
            prisma.profile.findUnique({
                where: { id: user.id },
                select: { organizationId: true, role: true, email: true }
            })
        ]);

        const ownedOrgId = profile?.organizationId;
        trace.push(`Found ${memberships.length} memberships`);
        trace.push(`Profile ownedOrgId: ${ownedOrgId ? ownedOrgId.slice(0, 8) + '...' : 'none'}`);

        let decision = 'UNKNOWN';
        let finalOrgId = null;

        if (memberships.length === 0 && ownedOrgId && profile?.role === 'OWNER') {
            decision = 'AUTO-REPAIR-CANDIDATE';
            trace.push('Matches auto-repair criteria');
        } else if (cookieOrgId) {
            const match = memberships.find(m => m.organizationId === cookieOrgId);
            if (match) {
                decision = 'ENTER (Cookie)';
                finalOrgId = cookieOrgId;
            } else {
                trace.push('Cookie invalid/stale');
            }
        }

        if (decision === 'UNKNOWN') {
            if (memberships.length === 0) decision = 'START';
            else if (memberships.length === 1) {
                decision = 'ENTER (Single member)';
                finalOrgId = memberships[0].organizationId;
            }
            else decision = 'SELECT';
        }

        return NextResponse.json({
            status: 'success',
            userId: user.id,
            email: user.email,
            cookieOrgId: cookieOrgId ? `${cookieOrgId.slice(0, 8)}...` : null,
            membershipsCount: memberships.length,
            memberships,
            profile,
            trace,
            finalDecision: decision,
            finalOrgId
        });
    } catch (e: any) {
        return NextResponse.json({
            status: 'error',
            error: e.message,
            trace
        }, { status: 500 });
    }
}
