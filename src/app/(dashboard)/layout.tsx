import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { PaywallProvider } from "@/components/dashboard/PaywallContext";
import { ShellCommercialProvider } from "@/components/layout/ShellCommercialDisplay";
import { resolveAccessContext } from '@/lib/auth/access-resolver';
import { getWorkspaceState } from '@/lib/auth/workspace-resolver';
import { redirect, unstable_rethrow } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 0. Resolve Access Context (High-level Source of Truth)
    let accessContext;
    try {
        accessContext = await resolveAccessContext();
    } catch (e: any) {
        unstable_rethrow(e);
        console.error("[DashboardLayout] Access Context Resolution failed:", e.message);
        redirect('/login');
    }

    const showNoOrgOverlay = !accessContext.activeOrgId;

    let profile = null;
    try {
        const profileRes = await supabase.from('Profile').select('*, organization:Organization(id, name)').eq('id', user.id).maybeSingle();
        profile = profileRes.data;
    } catch (e) {
        console.error("[DashboardLayout] Profile fetch failed:", e);
    }

    let settings = null;
    try {
        const settingsRes = await supabase.from('Settings').select('*').maybeSingle();
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
    const workspace = await getWorkspaceState();

    // 5. Serialization Sanitization (v2.1)
    // One-pass sanitization for all data passed to Client Components
    const sanitizedData = JSON.parse(JSON.stringify({
        profile,
        workspace,
        subscription,
        paywallVariant
    }));

    const { 
        profile: sanitizedProfile, 
        workspace: sanitizedWorkspace, 
        subscription: sanitizedSubscription, 
        paywallVariant: sanitizedPaywallVariant 
    } = sanitizedData;

    return (
        <PaywallProvider>
            <ShellCommercialProvider
                userRole={accessContext.globalRole || undefined}
                isSuperadmin={accessContext.isGlobalOperator}
                subscriptionStatus={accessContext.subscriptionStatus || undefined}
                plan={(sanitizedSubscription as any)?.planCode}
            >
                <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans relative">
                    {showNoOrgOverlay && <NoOrgOverlay />}
                    
                    <AppSidebar
                        profile={{ ...sanitizedProfile, role: accessContext.globalRole }}
                        settings={settings}
                        workspace={sanitizedWorkspace}
                    />
                    <MobileNav
                        profile={{ ...sanitizedProfile, role: accessContext.globalRole }}
                        settings={settings}
                        workspace={sanitizedWorkspace}
                    />
                    <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300 print:pl-0">
                        <AppHeader
                            profile={sanitizedProfile as any}
                            currentOrgId={currentOrgId || undefined}
                            subscription={sanitizedSubscription as any}
                            paywallVariant={sanitizedPaywallVariant}
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
