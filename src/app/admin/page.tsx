import Link from "next/link";
import { Building2, Users, CreditCard, Activity, Zap, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { SaaSHealthTable } from "@/components/admin/SaaSHealthTable";
import { SuperadminNotificationCenter } from "@/components/admin/SuperadminNotificationCenter";
import { SuperadminAlertsList, SuperadminMonthlyMetrics } from "@/components/admin/SuperadminV2Components";
import { RealRefreshButton } from "@/components/admin/RealRefreshButton";
import { getCockpitDataSafe, OperationalBlockStatus } from "@/lib/superadmin/cockpit-data-adapter";
import { CockpitService } from "@/lib/superadmin/cockpit-service";
import { cn } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
    console.log("[COCKPIT_V4.2.3] Rendering Hardened Dashboard");
    
    // 0. Unified Data Fetch (Isolated Blocks)
    const { blocks, systemStatus, loadTimeMs } = await getCockpitDataSafe();
    const isSafeMode = systemStatus === 'safe_mode';

    // 1. Audit Entry
    if (systemStatus === 'operational') {
        try {
            const { createClient } = await import('@/lib/supabase/server');
            const supabase = await createClient();
            const { data: authData } = await supabase.auth.getUser();
            if (authData.user) {
                await CockpitService.auditAdminAction(authData.user.id, 'SUPERADMIN_COCKPIT_VIEWED', `v4.2.3 Hardened (load: ${loadTimeMs}ms)`);
            }
        } catch {
            // Silence non-critical audit failures
        }
    }

    const stats = [
        {
            id: "cockpit-kpi-total-orgs",
            label: "Organizaciones",
            value: typeof blocks.kpis.data.totalOrgs === 'number' ? blocks.kpis.data.totalOrgs : 0,
            icon: Building2,
            color: "text-blue-600",
            bg: "bg-blue-50",
            status: blocks.kpis.status
        },
        {
            id: "cockpit-kpi-alerts",
            label: "Alertas Críticas",
            value: Array.isArray(blocks.alerts.data) ? blocks.alerts.data.filter((a) => a?.severity === 'CRITICAL').length : 0,
            icon: ShieldAlert,
            color: "text-red-600",
            bg: "bg-red-50",
            status: blocks.alerts.status
        },
        {
            id: "cockpit-kpi-risk",
            label: "Facturación en Riesgo",
            value: typeof blocks.kpis.data.issuesCount === 'number' ? blocks.kpis.data.issuesCount : 0,
            icon: CreditCard,
            color: "text-amber-600",
            bg: "bg-amber-50",
            status: blocks.kpis.status
        },
    ];

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-12" data-testid="superadmin-cockpit-root">
            
            {/* 0. High-Fidelity Banner */}
            {isSafeMode && (
                <div 
                    className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-6 rounded-[2.5rem] flex items-start gap-5 shadow-sm animate-in slide-in-from-top-4 duration-500"
                    data-testid="cockpit-banner-runtime"
                >
                    <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl shadow-inner shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-amber-900 dark:text-amber-100 font-black italic tracking-tight uppercase text-xs mb-1">Aislamiento Activo (Safe Mode)</h3>
                        <p className="text-amber-700/80 dark:text-amber-300/80 text-[11px] leading-relaxed font-medium max-w-2xl">
                            Falta la configuración de nivel de servicio (<code className="bg-amber-100 dark:bg-amber-950 px-1 py-0.5 rounded font-bold">SERVICE_ROLE</code>). El Cockpit está operando bajo políticas restrictivas para garantizar la seguridad.
                        </p>
                    </div>
                </div>
            )}

            {/* Header with Global Status Badge */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/50 pb-8">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div 
                            className={cn(
                                "flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest shadow-sm",
                                isSafeMode 
                                    ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
                                    : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                            )}
                            data-testid="cockpit-global-mode-badge"
                        >
                            <div className={cn("w-1.5 h-1.5 rounded-full", isSafeMode ? "bg-amber-500" : "bg-emerald-500 animate-pulse")} />
                            {isSafeMode ? 'Safe Mode' : 'Operational'}
                        </div>
                        <h1 className="text-4xl font-black text-foreground tracking-tighter bg-gradient-to-r from-blue-700 to-indigo-500 bg-clip-text text-transparent italic uppercase">Global Cockpit v4.2.3</h1>
                    </div>
                    <p className="text-muted-foreground font-medium underline decoration-blue-500/20 underline-offset-8 tracking-tight italic">Centro de mando endurecido y gobernanza multi-tenant.</p>
                </div>
                <div className="flex items-center gap-3">
                    <SuperadminNotificationCenter />
                </div>
            </div>

            {/* 1. Alerts Section (Isolated) */}
            <section className="min-h-[80px]" data-testid="cockpit-alerts-card">
                <BlockContainer status={blocks.alerts.status} label="Alertas de Producción" message={blocks.alerts.message}>
                    <SuperadminAlertsList alerts={blocks.alerts.data} />
                </BlockContainer>
            </section>

            {/* 2. Global KPI Aggregation */}
            <div className="bg-zinc-950 rounded-[3rem] p-10 text-white overflow-hidden relative shadow-2xl border border-white/5 shadow-blue-500/10 group">
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-center md:text-left">
                    <KPICell label="Engine Status" status={blocks.kpis.status}>
                        <div className="flex items-center justify-center md:justify-start gap-3">
                            <Activity className={cn("w-5 h-5", blocks.kpis.status === 'ok' ? 'text-emerald-400' : 'text-zinc-600')} />
                            <span className="text-2xl font-black italic uppercase tracking-tighter">
                                {blocks.kpis.status === 'ok' ? 'Online' : 'Restricted'}
                            </span>
                        </div>
                    </KPICell>
                    <KPICell label="Facturación Riesgo" value={blocks.kpis.data.issuesCount} status={blocks.kpis.status} color="text-rose-400" />
                    <KPICell label="Incidentes" value={blocks.alerts.data.length} status={blocks.alerts.status} color="text-blue-400" />
                    <KPICell label="Total Nodos" value={blocks.kpis.data.totalOrgs} status={blocks.kpis.status} />
                </div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -mr-64 -mt-64 group-hover:bg-blue-600/15 transition-all duration-1000 animate-pulse" />
            </div>

            {/* 3. Metrics & Stats Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                <div className="xl:col-span-2" data-testid="cockpit-metrics-card">
                    <BlockContainer status={blocks.metrics.status} label="Rendimiento del Ecosistema" height="min-h-[400px]" message={blocks.metrics.message}>
                        <SuperadminMonthlyMetrics data={blocks.metrics.data} />
                    </BlockContainer>
                </div>
                <div className="space-y-6">
                    {stats.map((stat) => (
                        <div key={stat.id} data-testid={stat.id} className={cn(
                            "bg-card p-7 rounded-[2.5rem] border border-border shadow-sm transition-all group relative overflow-hidden",
                            stat.status !== 'ok' ? "opacity-80 grayscale-[0.5]" : "hover:shadow-2xl hover:border-blue-500/20"
                        )}>
                            <div className="flex items-center gap-5 relative z-10">
                                <div className={cn("p-4 rounded-2xl transition-transform group-hover:rotate-6 duration-300 shadow-sm", stat.bg, stat.color)}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] leading-none mb-2">{stat.label}</p>
                                    <h3 className="text-3xl font-black text-foreground tracking-tighter">
                                        {stat.status === 'ok' ? stat.value : '---'}
                                    </h3>
                                    {stat.status !== 'ok' && (
                                        <p className="text-[8px] text-amber-600 font-bold mt-1.5 uppercase tracking-widest italic">Aislamiento Activo</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="p-2 px-6">
                        <RealRefreshButton />
                    </div>
                </div>
            </div>

            {/* 4. Organizations Detail */}
            <div className="space-y-6 p-1" data-testid="cockpit-orgs-table">
                <BlockContainer status={blocks.orgs.status} label="Directorio Maestro de Empresas" message={blocks.orgs.message}>
                    <SaaSHealthTable orgs={blocks.orgs.data} />
                </BlockContainer>
            </div>

            {/* 5. Master Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-12 border-t border-border/50 pt-12">
                <AdminLink href="/admin/orgs" label="Directorio" icon={<Building2 className="w-4 h-4" />} />
                <AdminLink href="/admin/users" label="Usuarios" icon={<Users className="w-4 h-4" />} />
                <AdminLink href="/admin/plans" label="Facturación" icon={<CreditCard className="w-4 h-4" />} />
                <AdminLink href="/admin/settings" label="Sistema" icon={<Zap className="w-4 h-4" />} />
            </div>
        </div>
    );
}

// Hardened UI Components
function BlockContainer({ children, status, label, height = "min-h-[100px]", message }: { children: React.ReactNode, status: OperationalBlockStatus, label: string, height?: string, message?: string }) {
    if (status === 'degraded_config' || status === 'degraded_service') {
        return (
            <div className={cn("w-full flex items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/20 border-2 border-dashed border-border rounded-[3rem] p-12 transition-all hover:border-zinc-300 dark:hover:border-zinc-800 group/block", height)}>
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-border">
                        <ShieldCheck className="w-8 h-8 text-zinc-300" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-foreground mb-1">{label}</p>
                        <p className="text-[10px] text-muted-foreground font-medium italic max-w-sm mx-auto">
                            {message || 'Disponible al completar configuración del servidor'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'empty') {
        return (
            <div className={cn("w-full flex items-center justify-center bg-zinc-50/30 dark:bg-zinc-950/10 border-2 border-dashed border-border rounded-[3rem] p-12", height)}>
                <div className="text-center">
                    <Activity className="w-8 h-8 text-zinc-200 mx-auto mb-3" />
                    <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">{label} - Sin Datos</p>
                </div>
            </div>
        );
    }

    return children;
}

function KPICell({ label, value, status, color = "text-white", children }: { label: string, value?: number, status: OperationalBlockStatus, color?: string, children?: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.25em]">{label}</div>
            {children ? children : (
                <div className={cn("text-3xl font-black italic tracking-tighter", status === 'ok' ? color : 'text-zinc-700')}>
                    {status === 'ok' ? (value ?? 0) : '---'}
                </div>
            )}
        </div>
    );
}

function AdminLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
    return (
        <Link href={href} className="p-8 bg-card border border-border rounded-[2rem] text-center hover:border-blue-500/50 hover:bg-muted/50 transition-all group flex items-center justify-center gap-4 shadow-md hover:shadow-xl active:scale-95 duration-300">
            <span className="text-muted-foreground group-hover:text-blue-500 transition-colors scale-125">{icon}</span>
            <span className="text-[11px] font-black text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-[0.2em]">{label}</span>
        </Link>
    );
}
