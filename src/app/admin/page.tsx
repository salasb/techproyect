import { Building2, Users, AlertTriangle, CreditCard, Activity, Zap } from "lucide-react";
import Link from "next/link";
import { CockpitService } from "@/lib/superadmin/cockpit-service";
import { SaaSHealthTable } from "@/components/admin/SaaSHealthTable";
import { SuperadminNotificationCenter } from "@/components/admin/SuperadminNotificationCenter";
import { SuperadminAlertsList, SuperadminMonthlyMetrics } from "@/components/admin/SuperadminV2Components";
import { AlertsService } from "@/lib/superadmin/alerts-service";
import { MetricsService } from "@/lib/superadmin/metrics-service";
import { RealRefreshButton } from "@/components/admin/RealRefreshButton";

export default async function AdminDashboard() {
    console.log("[ADMIN_ROUTE] start");
    
    // 0. Env Check
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbUrl = process.env.DATABASE_URL;
    console.log(`[ADMIN_ROUTE] env_check service_role_present=${!!serviceRoleKey} db_url_present=${!!dbUrl}`);

    if (!serviceRoleKey) {
        console.error("[ADMIN_ROUTE] error: ADMIN_ENV_MISSING_SERVICE_ROLE");
        throw new Error("ADMIN_ENV_MISSING: SUPABASE_SERVICE_ROLE_KEY is not defined in this environment.");
    }

    if (!dbUrl) {
        console.error("[ADMIN_ROUTE] error: ADMIN_ENV_MISSING_DATABASE_URL");
        throw new Error("ADMIN_ENV_MISSING: DATABASE_URL is not defined in this environment.");
    }

    // 1. Fetch Global Insights & Stats using the Cockpit & V2 Services
    console.log("[ADMIN_ROUTE] data_loader_start");
    const [kpis, orgs, alerts, metrics] = await Promise.all([
        CockpitService.getGlobalKPIs(),
        CockpitService.getOrganizationsList(),
        AlertsService.getGlobalAlertsSummary(),
        MetricsService.getAggregatedMonthlyMetrics()
    ]).catch(err => {
        console.error("[ADMIN_ROUTE] data_fetch_failed", err);
        throw err;
    });

    console.log("[ADMIN_ROUTE] data_loader_success");

    // Audit view
    try {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await CockpitService.auditAdminAction(user.id, 'SUPERADMIN_COCKPIT_VIEWED', 'Superadmin viewed global cockpit v2.0');
        }
    } catch (e) {
        console.error("Failed to audit cockpit view", e);
    }

    const stats = [
        {
            label: "Organizaciones",
            value: kpis.totalOrgs,
            icon: Building2,
            color: "text-blue-600",
            bg: "bg-blue-50",
            sub: "Empresas registradas"
        },
        {
            label: "Alertas Críticas",
            value: (alerts as any[]).filter(a => a.severity === 'CRITICAL').length,
            icon: ShieldAlertIcon,
            color: "text-red-600",
            bg: "bg-red-50",
            sub: "Requieren acción inmediata"
        },
        {
            label: "Facturación / Issues",
            value: kpis.issuesCount,
            icon: CreditCard,
            color: "text-amber-600",
            bg: "bg-amber-50",
            sub: "Suscripciones con problemas"
        },
    ];

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-12" data-testid="superadmin-cockpit-root">
            {/* Header with Notification Center */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/50 pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                        <h1 className="text-3xl font-black text-foreground tracking-tight bg-gradient-to-r from-blue-700 to-indigo-500 bg-clip-text text-transparent italic">Global Cockpit v2.0</h1>
                    </div>
                    <p className="text-muted-foreground font-medium underline decoration-blue-500/30 underline-offset-4">Gestión proactiva y monitorización estratégica de TechWise.</p>
                </div>
                <div className="flex items-center gap-3">
                    <SuperadminNotificationCenter />
                </div>
            </div>

            {/* 1. Alerts & Critical Info (NEW v2.0) */}
            <SuperadminAlertsList alerts={alerts as any} />

            {/* 2. Global KPI Aggregation */}
            <div className="bg-zinc-900 rounded-3xl p-8 text-white overflow-hidden relative shadow-2xl border border-white/5">
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Salud del Ecosistema</div>
                        <div className="flex items-center gap-3">
                            <Activity className={`w-5 h-5 ${alerts.length === 0 ? 'text-emerald-400' : 'text-amber-400'}`} />
                            <span className="text-2xl font-black italic">
                                {alerts.length > 0 ? 'ATENCIÓN REQUERIDA' : 'SISTEMA ÓPTIMO'}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Facturación en Riesgo</div>
                        <div className="text-2xl font-black text-rose-400">{kpis.issuesCount}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Alertas Activas</div>
                        <div className="text-2xl font-black text-blue-400">{alerts.length}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Total Orgs</div>
                        <div className="text-2xl font-black text-white">{kpis.totalOrgs}</div>
                    </div>
                </div>
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-[80px] -ml-32 -mb-32" />
            </div>

            {/* 3. Metrics View (NEW v2.0) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2">
                    <SuperadminMonthlyMetrics data={metrics} />
                </div>
                <div className="space-y-6">
                    {stats.map((stat, i) => (
                        <div key={i} className="bg-card p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                            <div className="flex items-center gap-4 relative z-10">
                                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:rotate-3`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                                    <h3 className="text-2xl font-black text-foreground">{stat.value}</h3>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="p-1 px-4">
                        <RealRefreshButton />
                    </div>
                </div>
            </div>

            {/* 4. Organizations Health Detail */}
            <div className="space-y-6 p-1">
                <SaaSHealthTable orgs={orgs as any} />
            </div>

            {/* 5. Navigation Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AdminLink href="/admin/orgs" label="Directorio" icon={<Building2 className="w-4 h-4" />} />
                <AdminLink href="/admin/users" label="Usuarios" icon={<Users className="w-4 h-4" />} />
                <AdminLink href="/admin/plans" label="Facturación" icon={<CreditCard className="w-4 h-4" />} />
                <AdminLink href="/admin/settings" label="Sistema" icon={<Zap className="w-4 h-4" />} />
            </div>
        </div>
    );
}

function AdminLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
    return (
        <Link href={href} className="p-5 bg-card border border-border rounded-2xl text-center hover:border-blue-500/50 hover:bg-muted/50 transition-all group flex items-center justify-center gap-3 shadow-sm">
            <span className="text-muted-foreground group-hover:text-blue-500 transition-colors">{icon}</span>
            <span className="text-[10px] font-black text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-widest">{label}</span>
        </Link>
    );
}

function ShieldCheckIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path><path d="m9 12 2 2 4-4"></path></svg>
    );
}

function ShieldAlertIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
    );
}
