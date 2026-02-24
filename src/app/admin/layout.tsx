import Link from "next/link";
import { 
    Shield, 
    LogOut, 
    Fingerprint 
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { logout } from "@/app/login/actions";
import { OrgSwitcher } from "@/components/layout/OrgSwitcher";
import { resolveSuperadminAccess } from "@/lib/auth/superadmin-guard";
import { AdminSidebarNav } from "@/components/admin/AdminSidebarNav";

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    console.log("[AdminGuard] Start validation v3.2");
    
    const access = await resolveSuperadminAccess();
    
    // Logging for server trace
    console.log(`[AdminGuard] user=${access.email} isSuperadmin=${access.isSuperadmin} denyReason=${access.denyReason}`);

    if (!access.ok) {
        // Diagnostic UI for access denied
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-slate-900">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-inner text-rose-600">
                        <Shield className="w-10 h-10" />
                    </div>
                    
                    <h1 className="text-3xl font-black italic tracking-tighter mb-2">Acceso Global Denegado</h1>
                    <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                        Tu identidad ha sido validada, pero no posees los privilegios de <span className="font-bold text-slate-900 underline decoration-rose-500/30">Superadmin</span> necesarios para este portal.
                    </p>

                    <div className="space-y-3 mb-8">
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <Fingerprint className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Razón</span>
                            </div>
                            <span className="text-[11px] font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{access.denyReason || 'unknown'}</span>
                        </div>
                        
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <span>Identidad</span>
                                <span className="text-slate-900 lowercase font-mono">{access.email || 'n/a'}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <span>Entorno</span>
                                <span className="text-slate-900 uppercase">{access.diagnostics.vercelEnv}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <span>Allowlist</span>
                                <span className="text-slate-900 max-w-[150px] truncate text-right font-mono text-[9px]">{access.diagnostics.allowlistMasked}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <span>Role DB</span>
                                <span className="text-slate-900">{access.diagnostics.profileRole || 'NONE'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <Link href="/dashboard" className="w-full py-4 bg-slate-900 text-white text-center rounded-2xl font-black uppercase tracking-[0.15em] text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98]">
                            Volver al Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Access Granted
    const { getWorkspaceState } = await import('@/lib/auth/workspace-resolver');
    const workspace = await getWorkspaceState();

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Admin Sidebar */}
            <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold leading-none italic tracking-tight">TechWise</h1>
                        <span className="text-[10px] uppercase tracking-widest text-blue-400 font-black">Portal Global</span>
                    </div>
                </div>

                <AdminSidebarNav />

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
                        <h2 className="text-slate-500 font-bold italic tracking-tight">Global Cockpit v4.6.0</h2>
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
                                {access.email?.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-black text-zinc-700 dark:text-zinc-300 max-w-[120px] truncate">
                                {access.email}
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
