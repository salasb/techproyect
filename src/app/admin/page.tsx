import { Building2, Users, AlertTriangle, CreditCard, Activity, Zap } from "lucide-react";
import Link from "next/link";
import { CockpitService } from "@/lib/superadmin/cockpit-service";
import { SaaSHealthTable } from "@/components/admin/SaaSHealthTable";
import { SuperadminNotificationCenter } from "@/components/admin/SuperadminNotificationCenter";
import { SuperadminAlertsList, SuperadminMonthlyMetrics } from "@/components/admin/SuperadminV2Components";
import { AlertsService } from "@/lib/superadmin/alerts-service";
import { MetricsService } from "@/lib/superadmin/metrics-service";
import { RealRefreshButton } from "@/components/admin/RealRefreshButton";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
    console.log("[CockpitData] start");
    
    // 0. Env Check (v2.8 Hardening)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbUrl = process.env.DATABASE_URL;
    const isServiceRolePresent = !!serviceRoleKey;
    const isDbUrlPresent = !!dbUrl;
    
    console.log(`[COCKPIT] env_check service_role_present=${isServiceRolePresent} db_url_present=${isDbUrlPresent}`);

    const configError = (!isServiceRolePresent || !isDbUrlPresent) 
        ? `CONFIG_INCOMPLETE: ${!isServiceRolePresent ? 'SUPABASE_SERVICE_ROLE_KEY ' : ''}${!isDbUrlPresent ? 'DATABASE_URL' : ''}`
        : null;

    if (configError) {
        console.error(`[CockpitData] critical_config_missing error=${configError}`);
        if (!isServiceRolePresent) console.warn("[CockpitData] missing_env SUPABASE_SERVICE_ROLE_KEY");
        if (!isDbUrlPresent) console.warn("[CockpitData] missing_env DATABASE_URL");
    }

    // 1. Fetch Data with granular fallbacks and structured logs
    async function fetchSafe<T>(promise: Promise<T>, fallback: T, name: string): Promise<T> {
        console.log(`[CockpitData] block=${name} start`);
        try {
            const res = await promise;
            console.log(`[CockpitData] block=${name} ok`);
            return res;
        } catch (err: any) {
            // CRITICAL: Re-throw Auth/Guard errors to trigger global error boundary
            if (err.message?.includes("Unauthorized") || err.message?.includes("Not authenticated")) {
                console.error(`[CockpitData] block=${name} FATAL_AUTH_ERROR: ${err.message}`);
                throw err;
            }

            console.error(`[CockpitData] block=${name} error=${err.message} code=${err.code || 'N/A'} cause=${err.cause || 'Unknown'}`);
            // If it's a Prisma error, we can log more
            if (err.meta) console.error(`[CockpitData] block=${name} prisma_meta=`, err.meta);
            return fallback;
        }
    }

    const [kpis, orgs, alerts, metrics] = configError 
        ? [null, [], [], []] 
        : await Promise.all([
            fetchSafe(CockpitService.getGlobalKPIs(), null, 'KPIs'),
            fetchSafe(CockpitService.getOrganizationsList(), [], 'OrgsList'),
            fetchSafe(AlertsService.getGlobalAlertsSummary(), [], 'AlertsSummary'),
            fetchSafe(MetricsService.getAggregatedMonthlyMetrics(), [], 'MonthlyMetrics')
        ]);
    
    console.log("[CockpitData] done");

    // Identity context for auditing (Only if config ok)
    if (!configError) {
        try {
            const { createClient } = await import('@/lib/supabase/server');
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await CockpitService.auditAdminAction(user.id, 'SUPERADMIN_COCKPIT_VIEWED', 'Superadmin viewed global cockpit v2.8');
            }
        } catch (e) {
            console.warn("[COCKPIT] Audit log failed (non-critical)");
        }
    }

    // Prepare Stats with fallbacks
    const safeKpis = kpis || { totalOrgs: 0, issuesCount: 0, activeTrials: 0, inactiveOrgs: 0 };
    const safeAlerts = Array.isArray(alerts) ? alerts : [];
    const safeOrgs = Array.isArray(orgs) ? orgs : [];
    const safeMetrics = Array.isArray(metrics) ? metrics : [];

    const stats = [
        {
            label: "Organizaciones",
            value: safeKpis.totalOrgs,
            icon: Building2,
            color: "text-blue-600",
            bg: "bg-blue-50",
            sub: "Empresas registradas"
        },
        {
            label: "Alertas Críticas",
            value: safeAlerts.filter(a => a?.severity === 'CRITICAL').length,
            icon: ShieldAlertIcon,
            color: "text-red-600",
            bg: "bg-red-50",
            sub: "Requieren acción inmediata"
        },
        {
            label: "Facturación / Issues",
            value: safeKpis.issuesCount,
            icon: CreditCard,
            color: "text-amber-600",
            bg: "bg-amber-50",
            sub: "Suscripciones con problemas"
        },
    ];

    console.log("[COCKPIT] page_render_start");

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-12" data-testid="superadmin-cockpit-root">
            {/* 0. Diagnostic Banner (Conditional) */}
            {configError && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-6 rounded-[2rem] flex items-start gap-4 shadow-sm animate-in slide-in-from-top-4 duration-500">
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-1" />
                    <div>
                        <h3 className="text-amber-900 dark:text-amber-100 font-black italic tracking-tight uppercase text-sm mb-1">Configuración Incompleta en Servidor</h3>
                        <p className="text-amber-700 dark:text-amber-300 text-xs leading-relaxed font-medium">
                            El Cockpit se ha cargado en modo degradado porque faltan variables de entorno críticas: <code className="bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-200 font-bold">{configError.replace('CONFIG_INCOMPLETE: ', '')}</code>. Algunas funcionalidades pueden no estar disponibles.
                        </p>
                    </div>
                </div>
            )}

            {/* Header with Notification Center */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/50 pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                        <h1 className="text-3xl font-black text-foreground tracking-tight bg-gradient-to-r from-blue-700 to-indigo-500 bg-clip-text text-transparent italic">Global Cockpit v2.8</h1>
                    </div>
                    <p className="text-muted-foreground font-medium underline decoration-blue-500/30 underline-offset-4 tracking-tight">Gestión proactiva y monitorización estratégica de TechWise.</p>
                </div>
                <div className="flex items-center gap-3">
                    <SuperadminNotificationCenter />
                </div>
            </div>

            {/* 1. Alerts Section (Isolated) */}
            <section className="min-h-[100px]">
                <SuperadminAlertsList alerts={safeAlerts} />
            </section>

            {/* 2. Global KPI Aggregation */}
            <div className="bg-zinc-900 rounded-[2rem] p-8 text-white overflow-hidden relative shadow-2xl border border-white/5 shadow-blue-500/5">
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Salud del Ecosistema</div>
                        <div className="flex items-center gap-3">
                            <Activity className={`w-5 h-5 ${safeAlerts.length === 0 && !configError ? 'text-emerald-400' : 'text-amber-400'}`} />
                            <span className="text-2xl font-black italic">
                                {configError ? 'SISTEMA DEGRADADO' : safeAlerts.length > 0 ? 'ATENCIÓN REQUERIDA' : 'SISTEMA ÓPTIMO'}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Facturación en Riesgo</div>
                        <div className="text-2xl font-black text-rose-400">{safeKpis.issuesCount || 0}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Alertas Activas</div>
                        <div className="text-2xl font-black text-blue-400">{safeAlerts.length}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Total Orgs</div>
                        <div className="text-2xl font-black text-white">{safeKpis.totalOrgs || 0}</div>
                    </div>
                </div>
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-[80px] -ml-32 -mb-32" />
            </div>

            {/* 3. Metrics View (NEW v2.0) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2">
                    <SuperadminMonthlyMetrics data={safeMetrics} />
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
                                    <h3 className="text-2xl font-black text-foreground">{stat.value || 0}</h3>
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
                <SaaSHealthTable orgs={safeOrgs} />
            </div>

            {/* 5. Navigation Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-8">
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
