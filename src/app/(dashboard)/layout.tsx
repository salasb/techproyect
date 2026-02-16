import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { createClient } from "@/lib/supabase/server";

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

    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">
            <AppSidebar profile={profile} />
            <MobileNav profile={profile} />
            <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300 print:pl-0">
                <AppHeader profile={profile} />
                <main className="flex-1 p-4 md:p-6 overflow-auto print:p-0 print:overflow-visible">
                    <div className="max-w-7xl mx-auto space-y-6 print:max-w-none print:space-y-0">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
