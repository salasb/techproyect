import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { headers, cookies } from 'next/headers';

export async function GET(request: Request) {
    // 1. Protection Flag
    if (process.env.DEBUG_WORKSPACE !== '1') {
        return NextResponse.json({ error: 'Forense endpoint no habilitado. Configurar DEBUG_WORKSPACE=1 en env' }, { status: 403 });
    }

    try {
        const headersList = await headers();
        const cookieStore = await cookies();
        const host = headersList.get('host') || 'unknown';
        const referer = headersList.get('referer') || 'unknown';
        const isPreviewDomain = host.endsWith('.vercel.app') && !host.includes('techproyect.vercel.app');

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        // Environment fingerprint (safe subset)
        const dbUrlSegment = process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]?.substring(0, 15) || 'unknown';
        const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'unknown';

        if (!user) {
            return NextResponse.json({
                status: 'AUTH_MISSING',
                env: { host, isPreviewDomain, dbUrlSegment, projectRef },
                details: 'No hay usuario autenticado en la sesión de Supabase.'
            }, { status: 401 });
        }

        // DB Data fetching (Read-only)
        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { id: true, email: true, organizationId: true, role: true }
        });

        const memberships = await prisma.organizationMember.findMany({
            where: { userId: user.id },
            select: { organizationId: true, role: true, status: true }
        });

        const activeOrgFromCookie = cookieStore.get('app-org-id')?.value || null;

        // Global DB sizes to check if we are connecting to a fresh DB by mistake
        const totalProfiles = await prisma.profile.count();
        const totalOrgs = await prisma.organization.count();
        const totalProjects = await prisma.project.count();

        // Flags de sospecha
        let profileMissing = !profile;
        let dbLooksEmpty = totalProfiles < 5 && totalOrgs < 5; // Heurística muy simple
        let cookieMissingButHasMemberships = !activeOrgFromCookie && memberships.length > 0;
        let domainHopLikely = isPreviewDomain && cookieMissingButHasMemberships;

        // Si hay cookie, revisamos conteos de esa org
        let activeOrgCounts = null;
        let activeOrgName = null;
        let billingInfo = null;
        if (activeOrgFromCookie) {
            const orgInfo = await prisma.organization.findUnique({
                where: { id: activeOrgFromCookie },
                select: { name: true }
            });
            activeOrgName = orgInfo?.name || null;

            const projects = await prisma.project.count({ where: { organizationId: activeOrgFromCookie } });
            const quotes = await prisma.quote.count({ where: { project: { organizationId: activeOrgFromCookie } } });
            const invoices = await prisma.invoice.count({ where: { organizationId: activeOrgFromCookie } });
            activeOrgCounts = { projects, quotes, invoices };

            const subscription = await prisma.subscription.findUnique({
                where: { organizationId: activeOrgFromCookie },
                select: { status: true, providerCustomerId: true, planCode: true, currentPeriodEnd: true }
            });

            billingInfo = {
                hasSubscriptionRecord: !!subscription,
                status: subscription?.status || null,
                hasProviderCustomer: !!subscription?.providerCustomerId,
                planCode: subscription?.planCode || null,
                currentPeriodEnd: subscription?.currentPeriodEnd || null,
            };
        }

        // Obtener estado real del resolver
        const { getWorkspaceState } = await import('@/lib/auth/workspace-resolver');
        const workspaceState = await getWorkspaceState();

        // Determine scopeStatus
        let scopeStatus = 'missing';
        if (workspaceState.activeOrgId) {
            if (workspaceState.isSuperadmin) scopeStatus = 'valid'; // Superadmin assumes valid if id exists (already validated by set)
            else if (memberships.some(m => m.organizationId === workspaceState.activeOrgId)) scopeStatus = 'valid';
            else scopeStatus = 'invalid';
        }

        return NextResponse.json({
            status: 'OK',
            environment: {
                host,
                referer,
                isPreviewDomain,
                dbUrlSegment,
                projectRef
            },
            auth: {
                userId: user.id,
                email: user.email,
                isSuperadmin: workspaceState.isSuperadmin,
                profileRole: profile?.role || null,
                workspaceStatus: workspaceState.status,
                activeOrgResolved: workspaceState.activeOrgId
            },
            operatingContext: {
                activeOrgId: workspaceState.activeOrgId,
                activeOrgName: activeOrgName,
                scopeStatus: scopeStatus,
                commercialScopeReady: scopeStatus === 'valid' && !!workspaceState.activeOrgId,
                orgContextSource: activeOrgFromCookie ? 'cookie' : (profile?.organizationId ? 'profile_fallback' : 'none'),
                hasOrganizations: memberships.length > 0,
                workspaceStatus: workspaceState.status,
                isSuperadmin: workspaceState.isSuperadmin
            },
            billing: billingInfo,
            bootstrap: workspaceState.bootstrapDebug || null,
            database: {
                profileFound: !!profile,
                profileData: profile,
                membershipsCount: memberships.length,
                memberships: memberships,
                activeOrgFromCookie,
                activeOrgCounts,
                globalCounts: {
                    profiles: totalProfiles,
                    organizations: totalOrgs,
                    projects: totalProjects
                }
            },
            flags: {
                profileMissing,
                dbLooksEmpty,
                domainHopLikely,
                cookieMissingButHasMemberships
            }
        });

    } catch (error: any) {
        return NextResponse.json({
            status: 'ERROR',
            message: 'Error procesando diagnóstico forense.',
            error: error.message
        }, { status: 500 });
    }
}
