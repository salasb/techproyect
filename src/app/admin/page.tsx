import { Building2, Users, AlertTriangle, CreditCard, Activity, Zap, ShieldCheck, AlertCircle } from "lucide-react";
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
    console.log("[COCKPIT_MAIN] start");
    
    // 0. Env Check (v2.9 Hardening)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbUrl = process.env.DATABASE_URL;
    const isServiceRolePresent = !!serviceRoleKey;
    const isDbUrlPresent = !!dbUrl;
    
    console.log(`[COCKPIT_MAIN] env_check service_role_present=${isServiceRolePresent} db_url_present=${isDbUrlPresent}`);

    const configError = (!isServiceRolePresent || !isDbUrlPresent) 
        ? `CONFIG_INCOMPLETE: ${!isServiceRolePresent ? 'SUPABASE_SERVICE_ROLE_KEY ' : ''}${!isDbUrlPresent ? 'DATABASE_URL' : ''}`
        : null;

    // 1. Fetch Data with granular fallbacks and isolation
    async function fetchBlock<T>(promise: Promise<T>, fallback: T, tag: string): Promise<{ data: T, error: string | null }> {
        console.log(`[${tag}] start`);
        try {
            const res = await promise;
            console.log(`[${tag}] ok`);
            return { data: res, error: null };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            // CRITICAL: Re-throw Auth/Guard errors
            if (message.includes("Unauthorized") || message.includes("Not authenticated")) {
                console.error(`[${tag}] FATAL_AUTH_ERROR: ${message}`);
                throw err;
            }

            console.error(`[${tag}] error=${message}`);
            return { data: fallback, error: message };
        }
    }

    const [kpisRes, orgsRes, alertsRes, metricsRes] = configError 
        ? [
            { data: { totalOrgs: 0, issuesCount: 0, activeTrials: 0, inactiveOrgs: 0, timestamp: new Date() }, error: 'Configuración incompleta' },
            { data: [], error: 'Configuración incompleta' },
            { data: [], error: 'Configuración incompleta' },
            { data: [], error: 'Configuración incompleta' }
          ]
        : await Promise.all([
            fetchBlock(CockpitService.getGlobalKPIs(), { totalOrgs: 0, issuesCount: 0, activeTrials: 0, inactiveOrgs: 0, timestamp: new Date() }, 'COCKPIT_KPI'),
            fetchBlock(CockpitService.getOrganizationsList(), [], 'COCKPIT_ORGS'),
            fetchBlock(AlertsService.getGlobalAlertsSummary(), [], 'COCKPIT_ALERTS'),
            fetchBlock(MetricsService.getAggregatedMonthlyMetrics(), [], 'COCKPIT_METRICS')
        ]);
    
    console.log("[COCKPIT_MAIN] done");

    const kpis = kpisRes.data;
    const orgs = orgsRes.data;
    const alerts = alertsRes.data;
    const metrics = metricsRes.data;

    // Identity context for auditing (Only if config ok)
    if (!configError) {
        try {
            const { createClient } = await import('@/lib/supabase/server');
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await CockpitService.auditAdminAction(user.id, 'SUPERADMIN_COCKPIT_VIEWED', 'Superadmin viewed global cockpit v2.9');
            }
        } catch {
            console.warn("[COCKPIT_MAIN] Audit log failed (non-critical)");
        }
    }

    const stats = [
        {
            label: "Organizaciones",
            value: kpis.totalOrgs,
            icon: Building2,
            color: "text-blue-600",
            bg: "bg-blue-50",
            sub: "Empresas registradas",
            error: kpisRes.error
        },
        {
            label: "Alertas Críticas",
            value: alerts.filter(a => a?.severity === 'CRITICAL').length,
            icon: ShieldAlertIcon,
            color: "text-red-600",
            bg: "bg-red-50",
            sub: "Requieren acción inmediata",
            error: alertsRes.error
        },
        {
            label: "Facturación / Issues",
            value: kpis.issuesCount,
            icon: CreditCard,
            color: "text-amber-600",
            bg: "bg-amber-50",
            sub: "Suscripciones con problemas",
            error: kpisRes.error
        },
    ];

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-12" data-testid="superadmin-cockpit-root">
            {/* 0. Diagnostic Banner */}
            {configError && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-6 rounded-[2rem] flex items-start gap-4 shadow-sm animate-in slide-in-from-top-4 duration-500">
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-1" />
                    <div>
                        <h3 className="text-amber-900 dark:text-amber-100 font-black italic tracking-tight uppercase text-sm mb-1">Modo Seguro: Configuración Incompleta</h3>
                        <p className="text-amber-700 dark:text-amber-300 text-xs leading-relaxed font-medium">
                            Faltan variables de entorno críticas en el servidor: <code className="bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-200 font-bold">{configError.replace('CONFIG_INCOMPLETE: ', '')}</code>. 
                            Las métricas globales y la conexión con el Admin Client están desactivadas para evitar fallos críticos.
                        </p>
                    </div>
                </div>
            )}

            {/* Header with Notification Center */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/50 pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <ShieldCheck className="w-5 h-5 text-blue-600" />
                        <h1 className="text-3xl font-black text-foreground tracking-tight bg-gradient-to-r from-blue-700 to-indigo-500 bg-clip-text text-transparent italic">Global Cockpit v2.9</h1>
                    </div>
                    <p className="text-muted-foreground font-medium underline decoration-blue-500/30 underline-offset-4 tracking-tight">Gestión proactiva y monitorización estratégica de TechWise.</p>
                </div>
                <div className="flex items-center gap-3">
                    <SuperadminNotificationCenter />
                </div>
            </div>

            {/* 1. Alerts Section (Isolated) */}
            <section className="min-h-[100px]">
                {alertsRes.error ? (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold">
                        Error al cargar alertas: {alertsRes.error}
                    </div>
                ) : (
                    <SuperadminAlertsList alerts={alerts} />
                )}
            </section>

            {/* 2. Global KPI Aggregation */}
            <div className="bg-zinc-900 rounded-[2rem] p-8 text-white overflow-hidden relative shadow-2xl border border-white/5 shadow-blue-500/5">
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Salud del Ecosistema</div>
                        <div className="flex items-center gap-3">
                            <Activity className={`w-5 h-5 ${alerts.length === 0 && !configError ? 'text-emerald-400' : 'text-amber-400'}`} />
                            <span className="text-2xl font-black italic">
                                {configError ? 'SISTEMA DEGRADADO' : alerts.length > 0 ? 'ATENCIÓN REQUERIDA' : 'SISTEMA ÓPTIMO'}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Facturación en Riesgo</div>
                        <div className="text-2xl font-black text-rose-400">{kpis.issuesCount || 0}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Alertas Activas</div>
                        <div className="text-2xl font-black text-blue-400">{alerts.length}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Total Orgs</div>
                        <div className="text-2xl font-black text-white">{kpis.totalOrgs || 0}</div>
                    </div>
                </div>
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-[80px] -ml-32 -mb-32" />
            </div>

            {/* 3. Metrics View */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2">
                    {metricsRes.error ? (
                        <div className="h-full min-h-[300px] flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 border border-border rounded-3xl p-10 text-center">
                            <div>
                                <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                                <p className="text-sm font-bold text-foreground">Métricas no disponibles</p>
                                <p className="text-xs text-muted-foreground mt-1">{metricsRes.error}</p>
                            </div>
                        </div>
                    ) : (
                        <SuperadminMonthlyMetrics data={metrics} />
                    )}
                </div>
                <div className="space-y-6">
                    {stats.map((stat, i) => (
                        <div key={i} className={`bg-card p-6 rounded-3xl border ${stat.error ? 'border-rose-200' : 'border-border'} shadow-sm hover:shadow-md transition-all group relative overflow-hidden`}>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:rotate-3`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                                    <h3 className="text-2xl font-black text-foreground">{stat.value || 0}</h3>
                                    {stat.error && <p className="text-[8px] text-rose-500 font-bold mt-1 uppercase">Error de sincronización</p>}
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
                {orgsRes.error ? (
                    <div className="p-10 text-center border-2 border-dashed border-border rounded-3xl">
                        <p className="text-muted-foreground text-sm font-medium">No se pudo cargar el directorio de organizaciones.</p>
                    </div>
                ) : (
                    <SaaSHealthTable orgs={orgs} />
                )}
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
