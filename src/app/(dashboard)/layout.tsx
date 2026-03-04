import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/current-org";
import prisma from "@/lib/prisma";
import { PaywallProvider } from "@/components/dashboard/PaywallContext";
import { OperatingContextBanner } from "@/components/layout/OperatingContextBanner";

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

    // 0. Resolve Workspace State (Canonical)
    const { getWorkspaceState } = await import('@/lib/auth/workspace-resolver');
    const workspace = await getWorkspaceState();

    // 0.5 Canonical Redirect Guard (v1.2)
    const { resolveRedirect } = await import('@/lib/auth/redirect-resolver');
    const redirectPath = resolveRedirect({
        pathname: '/dashboard', // Layout acts as a proxy for child routes
        isAuthed: workspace.status !== 'NOT_AUTHENTICATED',
        hasOrgContext: !!workspace.activeOrgId,
        recommendedRoute: workspace.recommendedRoute
    });

    // In layout, we only redirect if it's a critical auth mismatch
    if (redirectPath === '/login') {
        const { redirect } = await import("next/navigation");
        redirect('/login');
    }

    // NEW: Don't redirect to /start. Instead, we show the overlay if activeOrgId is missing.
    const showNoOrgOverlay = !workspace.activeOrgId;

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

    const currentOrgId = workspace.activeOrgId;
    
    let subscription = null;
    if (currentOrgId) {
        try {
            subscription = await prisma.subscription.findUnique({ where: { organizationId: currentOrgId } });
        } catch (e) {
            console.error("[DashboardLayout] Subscription fetch failed:", e);
        }
    }

    // Fetch Experiment Variant - Defensive
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

    return (
        <PaywallProvider>
            <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans relative">
                {showNoOrgOverlay && <NoOrgOverlay />}
                
                <AppSidebar 
                    profile={{ ...profile, permissions: workspace.permissions, role: workspace.userRole }} 
                    settings={settings} 
                />
                <MobileNav 
                    profile={{ ...profile, permissions: workspace.permissions, role: workspace.userRole }} 
                    settings={settings} 
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
        </PaywallProvider>
    );
}
