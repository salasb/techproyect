import { 
    Building2, Users, CreditCard, Activity, Zap, ShieldCheck, 
    ShieldAlert, AlertTriangle, CheckCheck, Target, ClipboardList 
} from "lucide-react";
import { SaaSHealthTable } from "@/components/admin/SaaSHealthTable";
import { SuperadminNotificationCenter } from "@/components/admin/SuperadminNotificationCenter";
import { SuperadminAlertsList, SuperadminMonthlyMetrics, SuperadminOperationalKPIs } from "@/components/admin/SuperadminV2Components";
import { RealRefreshButton } from "@/components/admin/RealRefreshButton";
import { getCockpitDataSafe, OperationalBlockStatus } from "@/lib/superadmin/cockpit-data-adapter";
import { CockpitService } from "@/lib/superadmin/cockpit-service";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import prisma from "@/lib/prisma";

function BlockContainer({ status, children, label, message, traceId }: { status: OperationalBlockStatus, children: React.ReactNode, label: string, message?: string, traceId: string }) {
    if (status === 'degraded_config') {
        return (
            <Card className="rounded-[2.5rem] border-amber-200 bg-amber-50/50 p-10 flex flex-col items-center justify-center text-center">
                <ShieldCheck className="w-10 h-10 text-amber-400 mb-4 opacity-50" />
                <h3 className="text-amber-900 font-black uppercase text-xs tracking-widest">{label} Restringido</h3>
                <p className="text-amber-700/70 text-[10px] font-medium max-w-xs mt-2 italic">{message}</p>
                <span className="text-[8px] font-mono text-amber-400 mt-4 uppercase">Trace: {traceId}</span>
            </Card>
        );
    }

    if (status === 'degraded_service') {
        return (
            <Card className="rounded-[2.5rem] border-red-200 bg-red-50/50 p-10 flex flex-col items-center justify-center text-center">
                <Zap className="w-10 h-10 text-red-400 mb-4 opacity-50" />
                <h3 className="text-red-900 font-black uppercase text-xs tracking-widest">Fallo en {label}</h3>
                <p className="text-red-700/70 text-[10px] font-medium max-w-xs mt-2 italic">{message}</p>
                <span className="text-[8px] font-mono text-red-400 mt-4 uppercase">Trace: {traceId}</span>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {children}
        </div>
    );
}

export default async function AdminDashboard() {
    console.log("[COCKPIT_V4.6.0] Rendering Orchestration Dashboard");
    
    // 0. Unified Data Fetch (Isolated Blocks)
    const { blocks, systemStatus, loadTimeMs } = await getCockpitDataSafe();
    const isSafeMode = systemStatus === 'safe_mode';

    // 1. Audit Entry & Operational Recovery
    let lastEval: { executedAt: string; traceId: string; details: string } | null = null;
    let lastOp: { executedAt: string; action: string; details: string; actor: string } | null = null;

    if (systemStatus === 'operational') {
        try {
            const { createClient } = await import('@/lib/supabase/server');
            const supabase = await createClient();
            const { data: authData } = await supabase.auth.getUser();
            if (authData.user) {
                await CockpitService.auditAdminAction(authData.user.id, 'SUPERADMIN_COCKPIT_VIEWED', `v4.6.0 Orchestration (load: ${loadTimeMs}ms)`);
            }

            // Recovery of last evaluation and operations
            const [lastEvalLog, lastOpLog] = await Promise.all([
                prisma.auditLog.findFirst({
                    where: { action: 'SUPERADMIN_ALERTS_EVALUATED' },
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.auditLog.findFirst({
                    where: { 
                        action: { in: [
                            'SUPERADMIN_ALERT_ACKNOWLEDGED', 
                            'SUPERADMIN_ALERT_SNOOZED', 
                            'SUPERADMIN_ALERT_RESOLVED',
                            'SUPERADMIN_ALERT_OWNER_ASSIGNED',
                            'SUPERADMIN_ALERT_PLAYBOOK_STEP_TOGGLED'
                        ] } 
                    },
                    orderBy: { createdAt: 'desc' }
                })
            ]);

            if (lastEvalLog && lastEvalLog.createdAt && lastEvalLog.details) {
                lastEval = {
                    executedAt: lastEvalLog.createdAt.toISOString(),
                    traceId: lastEvalLog.details.match(/\[[A-Z0-9-]+\]/)?.[0]?.replace(/[\[\]]/g, '') || 'N/A',
                    details: lastEvalLog.details
                };
            }

            if (lastOpLog && lastOpLog.createdAt && lastOpLog.details) {
                lastOp = {
                    executedAt: lastOpLog.createdAt.toISOString(),
                    action: lastOpLog.action.replace('SUPERADMIN_ALERT_', ''),
                    details: lastOpLog.details,
                    actor: lastOpLog.userName || 'Superadmin'
                };
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
            label: "Incidentes Críticos",
            value: Array.isArray(blocks.alerts.data) ? blocks.alerts.data.filter((a) => a?.severity === 'critical' && a.state === 'open').length : 0,
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
                            Falta la configuración de nivel de servicio (<code className="bg-amber-100 dark:bg-amber-950 px-1 py-0.5 rounded font-bold">SERVICE_ROLE</code>). El Cockpit está operando bajo políticas restrictivas para garantizar la seguridad operacional.
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
                        <h1 className="text-4xl font-black text-foreground tracking-tighter bg-gradient-to-r from-blue-700 to-indigo-500 bg-clip-text text-transparent italic uppercase">Global Cockpit v4.6.0</h1>
                    </div>
                    <p className="text-muted-foreground font-medium underline decoration-blue-500/20 underline-offset-8 tracking-tight italic">Panel de Orquestación y Gobernanza de SLA.</p>
                </div>
                <div className="flex items-center gap-3">
                    <SuperadminNotificationCenter />
                </div>
            </div>

            {/* 0.5. Operational KPIs */}
            <SuperadminOperationalKPIs metrics={blocks.ops.data} />

            {/* 1. Health Status & Evaluation Recovery */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 min-h-[80px]" data-testid="cockpit-alerts-card">
                    <BlockContainer status={blocks.alerts.status} label="Incidentes Críticos" message={blocks.alerts.message} traceId={blocks.alerts.meta.traceId}>
                        <SuperadminAlertsList alerts={blocks.alerts.data} />
                    </BlockContainer>
                </section>
                
                <div className="space-y-6">
                    <Card className="rounded-[2.5rem] border-dashed border-2 border-border bg-slate-50/30 dark:bg-zinc-900/10 p-8 flex flex-col justify-between">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5 text-blue-500" />
                                Última Evaluación de Salud
                            </h3>
                            {lastEval ? (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white italic">
                                            {new Date(lastEval.executedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">{new Date(lastEval.executedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-900 border border-border p-4 rounded-2xl shadow-sm">
                                        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed">{lastEval.details.split(']: ')[1] || lastEval.details}</p>
                                    </div>
                                    <p className="text-[8px] font-mono text-slate-400 uppercase tracking-widest opacity-60">Trace: {lastEval.traceId}</p>
                                </div>
                            ) : (
                                <div className="py-10 text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">Sin ejecuciones detectadas</p>
                                </div>
                            )}
                        </div>
                        <div className="pt-6">
                            <RealRefreshButton />
                        </div>
                    </Card>

                    {lastOp && (
                        <Card className="rounded-[2.5rem] border border-border bg-white dark:bg-zinc-900/50 p-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 flex items-center gap-2">
                                {lastOp.action.includes('OWNER') ? <Target className="w-3.5 h-3.5 text-indigo-500" /> : 
                                 lastOp.action.includes('STEP') ? <ClipboardList className="w-3.5 h-3.5 text-blue-500" /> :
                                 <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />}
                                Última Acción Operativa
                            </h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="text-[8px] font-black uppercase border-emerald-200 text-emerald-700 bg-emerald-50">{lastOp.action}</Badge>
                                    <span className="text-[9px] font-bold text-slate-400">{new Date(lastOp.executedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed italic">&quot;{lastOp.details.replace('[Superadmin Cockpit] ', '')}&quot;</p>
                                <p className="text-[8px] font-black uppercase text-slate-400 tracking-tighter pt-1">Por: {lastOp.actor}</p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* Organizations Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        Directorio de Organizaciones
                    </h3>
                </div>
                <BlockContainer status={blocks.orgs.status} label="Organizaciones" message={blocks.orgs.message} traceId={blocks.orgs.meta.traceId}>
                    <SaaSHealthTable orgs={blocks.orgs.data} />
                </BlockContainer>
            </div>

            {/* Performance Metrics */}
            <section className="pt-8">
                <BlockContainer status={blocks.metrics.status} label="Métricas" message={blocks.metrics.message} traceId={blocks.metrics.meta.traceId}>
                    <SuperadminMonthlyMetrics data={blocks.metrics.data} />
                </BlockContainer>
            </section>
        </div>
    );
}
