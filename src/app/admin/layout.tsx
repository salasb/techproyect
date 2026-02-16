import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, LayoutDashboard, Building2, Users, Settings, LogOut } from "lucide-react";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Role check
    const { data: profile } = await supabase
        .from("Profile")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "SUPERADMIN") {
        redirect("/dashboard");
    }

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
            {/* Admin Sidebar */}
            <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold leading-none">TechWise</h1>
                        <span className="text-[10px] uppercase tracking-wider text-blue-400 font-bold">Portal Admin</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <AdminNavLink href="/admin" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
                    <AdminNavLink href="/admin/orgs" icon={<Building2 className="w-4 h-4" />} label="Organizaciones" />
                    <AdminNavLink href="/admin/users" icon={<Users className="w-4 h-4" />} label="Usuarios Globales" />
                    <div className="pt-4 pb-2 text-[10px] font-bold text-slate-500 uppercase px-3 tracking-widest">Configuración</div>
                    <AdminNavLink href="/admin/settings" icon={<Settings className="w-4 h-4" />} label="Ajustes Sistema" />
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm hover:text-white transition-colors">
                        <LogOut className="w-4 h-4" />
                        <span>Volver al App</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10">
                    <h2 className="text-slate-500 font-medium">Panel de Control Global</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded font-bold uppercase">SuperAdmin</span>
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border border-slate-300 dark:border-slate-700">
                            {/* Avatar placeholder */}
                        </div>
                    </div>
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

function AdminNavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 hover:text-white transition-all group"
        >
            <span className="text-slate-500 group-hover:text-blue-400">{icon}</span>
            {label}
        </Link>
    );
}
