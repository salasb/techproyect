import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { PaywallProvider } from "@/components/dashboard/PaywallContext";
import { ShellCommercialProvider } from "@/components/layout/ShellCommercialDisplay";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        const { redirect } = await import("next/navigation");
        redirect('/login');
    }

    // 0. Resolve Access Context (High-level Source of Truth)
    const { resolveAccessContext } = await import('@/lib/auth/access-resolver');
    let accessContext;
    try {
        accessContext = await resolveAccessContext();
    } catch (e: any) {
        console.error("[DashboardLayout] Access Context Resolution failed:", e.message);
        const { redirect } = await import("next/navigation");
        redirect('/login');
    }

    if (!accessContext) return null; // Type safety guard

    const showNoOrgOverlay = !accessContext.activeOrgId;

    let profile = null;
    if (user) {
        try {
            const profileRes = await supabase.from('Profile').select('*, organization:Organization(plan)').eq('id', user.id).maybeSingle();
            if (profileRes.error) throw profileRes.error;
            profile = profileRes.data;
        } catch (e) {
            console.error("[DashboardLayout] Profile fetch failed:", e);
        }
    }

    let settings = null;
    try {
        const settingsRes = await supabase.from('Settings').select('*').maybeSingle();
        if (settingsRes.error) throw settingsRes.error;
        settings = settingsRes.data;
    } catch (e) {
        console.error("[DashboardLayout] Settings fetch failed:", e);
    }

    const currentOrgId = accessContext.activeOrgId;
    
    let subscription = null;
    if (currentOrgId) {
        try {
            subscription = await prisma.subscription.findUnique({ where: { organizationId: currentOrgId } });
        } catch (e) {
            console.error("[DashboardLayout] Subscription fetch failed:", e);
        }
    }

    let paywallVariant: 'A' | 'B' = 'A';
    if (currentOrgId) {
        try {
            const { ExperimentService } = await import("@/services/experiment-service");
            const variant = await ExperimentService.getVariant(currentOrgId, 'EX_PAYWALL_COPY');
            paywallVariant = variant === 'EMOTIONAL' ? 'B' : 'A';
        } catch (e) {
            console.warn("[DashboardLayout] ExperimentService failed, falling back to variant A");
        }
    }

    const { NoOrgOverlay } = await import("@/components/auth/NoOrgOverlay");

    // Get Workspace state for sidebar/nav compat
    const { getWorkspaceState } = await import('@/lib/auth/workspace-resolver');
    const workspace = await getWorkspaceState();

    return (
        <PaywallProvider>
            <ShellCommercialProvider
                userRole={accessContext.globalRole || undefined}
                isSuperadmin={accessContext.isGlobalOperator}
                subscriptionStatus={accessContext.subscriptionStatus || undefined}
                plan={(subscription as any)?.planCode}
            >
                <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans relative">
                    {showNoOrgOverlay && <NoOrgOverlay />}
                    
                    <AppSidebar
                        profile={{ ...profile, permissions: workspace.permissions, role: accessContext.globalRole }}
                        settings={settings}
                        workspace={workspace}
                    />
                    <MobileNav
                        profile={{ ...profile, permissions: workspace.permissions, role: accessContext.globalRole }}
                        settings={settings}
                        workspace={workspace}
                    />
                    <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300 print:pl-0">
                        <AppHeader
                            profile={profile as any}
                            currentOrgId={currentOrgId || undefined}
                            subscription={subscription as any}
                            paywallVariant={paywallVariant}
                        />
                        <main className="flex-1 p-4 md:p-6 overflow-auto print:p-0 print:overflow-visible">
                            <div className="w-full space-y-6 print:max-w-none print:space-y-0">
                                {children}
                            </div>
                        </main>
                    </div>
                </div>
            </ShellCommercialProvider>
        </PaywallProvider>
    );
}
