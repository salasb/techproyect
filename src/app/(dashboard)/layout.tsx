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

    let profile = null;
    if (user) {
        const { data } = await supabase.from('Profile').select('*, organization:Organization(plan)').eq('id', user.id).single();
        profile = data;
    }

    const { data: settings } = await supabase.from('Settings').select('*').single();
    const currentOrgId = await getOrganizationId();
    const subscription = currentOrgId
        ? await prisma.subscription.findUnique({ where: { organizationId: currentOrgId } })
        : null;

    // Fetch Experiment Variant
    const { ExperimentService } = await import("@/services/experiment-service");
    const paywallVariant = currentOrgId
        ? await ExperimentService.getVariant(currentOrgId, 'EX_PAYWALL_COPY')
        : 'A';

    return (
        <PaywallProvider>
            <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">
                <AppSidebar profile={profile} settings={settings} />
                <MobileNav profile={profile} settings={settings} />
                <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300 print:pl-0">
                    <AppHeader
                        profile={profile}
                        currentOrgId={currentOrgId}
                        subscription={subscription as any}
                        paywallVariant={paywallVariant === 'EMOTIONAL' ? 'B' : 'A'}
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
