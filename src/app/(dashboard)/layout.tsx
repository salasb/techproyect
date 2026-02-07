import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">
            <AppSidebar />
            <MobileNav />
            <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300 print:pl-0">
                <AppHeader />
                <main className="flex-1 p-4 md:p-6 overflow-auto print:p-0 print:overflow-visible">
                    <div className="max-w-7xl mx-auto space-y-6 print:max-w-none print:space-y-0">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
