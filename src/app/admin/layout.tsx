import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, LayoutDashboard, Building2, Users, Settings, LogOut, CreditCard, TrendingUp } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { logout } from "@/app/login/actions";
import { OrgSwitcher } from "@/components/layout/OrgSwitcher";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    console.log("[AdminGuard] Start validation");
    
    // 1. Initial Identity Check
    const supabase = await createClient();
    const { data: authRes } = await supabase.auth.getUser();
    const user = authRes?.user;

    if (!user) {
        console.log("[AdminGuard] No user, redirecting to login");
        redirect("/login");
    }

    // 2. Privilege Check via Resolver
    let workspace;
    try {
        const { getWorkspaceState } = await import('@/lib/auth/workspace-resolver');
        workspace = await getWorkspaceState();
        
        if (!workspace.isSuperadmin) {
            console.warn(`[AdminGuard] Access denied for ${user.email}`);
            redirect("/dashboard");
        }
    } catch (e: any) {
        // If it's a Next.js redirect error, re-throw it!
        if (e.digest?.includes("NEXT_REDIRECT")) throw e;
        
        console.error("[AdminGuard] CRITICAL DB/PERM ERROR:", e);
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-red-100 animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                        <Shield className="w-8 h-8 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-2 italic tracking-tight">Acceso Global Protegido</h1>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                        El motor de base de datos ha denegado la solicitud de privilegios. Esto ocurre cuando los permisos del esquema público están desconfigurados (42501).
                    </p>
                    <div className="bg-slate-50 rounded-xl p-4 mb-6 font-mono text-[10px] text-slate-500 border border-slate-100">
                        Error: {e.code || "DB_RESTRICTION"} - No se pudo validar rol global
                    </div>
                    <Link href="/dashboard" className="block w-full py-3.5 bg-slate-900 text-white text-center rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-95">
                        Volver al Dashboard Local
                    </Link>
                </div>
            </div>
        );
    }

    // 3. Render Dashboard
    console.log("[AdminGuard] Access OK for Superadmin");
    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Admin Sidebar */}
            <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold leading-none italic tracking-tight">TechWise</h1>
                        <span className="text-[10px] uppercase tracking-widest text-blue-400 font-black">Portal Global</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <AdminNavLink href="/admin" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
                    <AdminNavLink href="/admin/orgs" icon={<Building2 className="w-4 h-4" />} label="Organizaciones" />
                    <AdminNavLink href="/admin/plans" icon={<CreditCard className="w-4 h-4" />} label="Planes y Precios" />
                    <AdminNavLink href="/admin/subscriptions" icon={<TrendingUp className="w-4 h-4" />} label="Métricas" />
                    <AdminNavLink href="/admin/users" icon={<Users className="w-4 h-4" />} label="Usuarios Globales" />
                    <div className="pt-4 pb-2 text-[10px] font-bold text-slate-500 uppercase px-3 tracking-widest">Configuración</div>
                    <AdminNavLink href="/admin/settings" icon={<Settings className="w-4 h-4" />} label="Ajustes Sistema" />
                </nav>

                <div className="p-4 border-t border-slate-800 space-y-2">
                    <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all group">
                        <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>Volver al App</span>
                    </Link>

                    <form action={logout}>
                        <button type="submit" className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all font-bold">
                            <LogOut className="w-4 h-4" />
                            <span>Cerrar Sesión</span>
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="h-16 bg-white/80 backdrop-blur-md dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <h2 className="text-slate-500 font-bold italic tracking-tight">Global Cockpit v2.3</h2>
                        <span 
                            className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2.5 py-1 rounded-full font-black uppercase tracking-widest border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm"
                            data-testid="superadmin-mode-badge"
                        >
                            Modo Global
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm" data-testid="user-identity-chip">
                            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                                {user.email?.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-black text-zinc-700 dark:text-zinc-300 max-w-[120px] truncate">
                                {user.email}
                            </span>
                            <span 
                                className="text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter border border-blue-200/50 dark:border-blue-800/50 shadow-sm"
                                data-testid="user-role-badge"
                            >
                                SuperAdmin
                            </span>
                        </div>
                        <OrgSwitcher currentOrgId={workspace.activeOrgId || undefined} />
                        <ThemeToggle />
                    </div>
                </header>
                <div className="p-8 max-w-7xl mx-auto">
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
