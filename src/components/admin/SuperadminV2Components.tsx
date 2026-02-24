"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
    ShieldAlert, AlertTriangle, Info, CheckCircle2, ExternalLink, 
    MoreVertical, Clock, CheckCheck, BellRing, Loader2, 
    User, Target, ClipboardList, AlertOctagon, TrendingUp,
    Timer, CheckCircle, ChevronRight, X, Filter, Search, 
    LayoutGrid, Rows, ChevronDown, ChevronUp, Eraser, EyeOff
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    acknowledgeCockpitAlert, snoozeCockpitAlert, resolveCockpitAlert, 
    assignCockpitAlertOwner, toggleCockpitPlaybookStep 
} from "@/app/actions/superadmin-v2";
import type { CockpitOperationalAlert, OperationalActionResult } from "@/lib/superadmin/cockpit-data-adapter";
import type { OperationalMetrics } from "@/lib/superadmin/cockpit-service";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { getPlaybookByRule } from "@/lib/superadmin/playbooks-catalog";
import { useSearchParams } from "next/navigation";

export function SuperadminTriagePanel({ 
    stats 
}: { 
    stats: { total: number; open: number; critical: number; breached: number; snoozed: number }
}) {
    return (
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-indigo-900 text-white p-8 space-y-8 sticky top-6">
            <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300 mb-6 flex items-center gap-2">
                    <Target className="w-3.5 h-3.5" />
                    Panel de Triage Operativo
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <p className="text-[9px] font-black uppercase text-indigo-200 tracking-widest opacity-60 mb-1">Abiertas</p>
                        <p className="text-2xl font-black tracking-tighter">{stats.open}</p>
                    </div>
                    <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
                        <p className="text-[9px] font-black uppercase text-red-200 tracking-widest opacity-60 mb-1">Críticas</p>
                        <p className="text-2xl font-black tracking-tighter text-red-100">{stats.critical}</p>
                    </div>
                    <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
                        <p className="text-[9px] font-black uppercase text-amber-200 tracking-widest opacity-60 mb-1">SLA Vencido</p>
                        <p className="text-2xl font-black tracking-tighter text-amber-100">{stats.breached}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 opacity-50">
                        <p className="text-[9px] font-black uppercase text-indigo-200 tracking-widest mb-1">Pospuestas</p>
                        <p className="text-2xl font-black tracking-tighter">{stats.snoozed}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10 relative">
                <div className="absolute -top-3 left-0 px-2 py-0.5 text-[6px] bg-indigo-500 text-white font-mono rounded">DBG-SIDE src:staticList | idx:0 | type:container</div>
                <h4 className="text-[9px] font-black uppercase text-indigo-300 tracking-widest">Accesos Rápidos</h4>
                <div className="grid grid-cols-1 gap-2 relative">
                    <Button variant="ghost" className="w-full justify-start text-[10px] font-black uppercase h-10 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white border-none transition-all relative overflow-hidden" asChild>
                        <Link href="?severity=CRITICAL" className="w-full">
                            <ShieldAlert className="w-3.5 h-3.5 mr-3 text-red-400" />
                            Ver Solo Críticas
                            <span className="absolute bottom-0 right-0 px-1 text-[6px] bg-black/50 text-white font-mono">DBG-SIDE key:1 | type:link</span>
                        </Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-[10px] font-black uppercase h-10 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white border-none transition-all relative overflow-hidden" asChild>
                        <Link href="?sla=BREACHED" className="w-full">
                            <AlertOctagon className="w-3.5 h-3.5 mr-3 text-amber-400" />
                            Ver SLA Vencido
                            <span className="absolute bottom-0 right-0 px-1 text-[6px] bg-black/50 text-white font-mono">DBG-SIDE key:2 | type:link</span>
                        </Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-[10px] font-black uppercase h-10 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white border-none transition-all relative overflow-hidden" asChild>
                        <Link href="?" className="w-full">
                            <Eraser className="w-3.5 h-3.5 mr-3 text-indigo-300" />
                            Limpiar Filtros
                            <span className="absolute bottom-0 right-0 px-1 text-[6px] bg-black/50 text-white font-mono">DBG-SIDE key:3 | type:link</span>
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="bg-indigo-800/50 p-6 rounded-[2rem] border border-white/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-black uppercase text-emerald-300">Salud de la Cola: Excelente</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full w-[85%] rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                </div>
                <p className="text-[8px] font-bold text-indigo-200 uppercase mt-3 tracking-widest opacity-50">85% Incidentes Resueltos hoy</p>
            </div>
        </Card>
    );
}

export function SuperadminOperationalKPIs({ metrics }: { metrics: OperationalMetrics }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
                { label: "MTTA", value: `${metrics.mttaMinutes}m`, sub: "Tiempo acuse", icon: Timer, color: "text-blue-600" },
                { label: "MTTR", value: `${metrics.mttrHours}h`, sub: "Tiempo resolución", icon: CheckCircle, color: "text-emerald-600" },
                { label: "Abiertas", value: metrics.openAlerts, sub: "Incidentes", icon: BellRing, color: "text-rose-600" },
                { label: "Vencidas", value: metrics.breachedAlerts, sub: "Fuera de SLA", icon: AlertOctagon, color: "text-orange-600" },
                { label: "Compliance", value: `${metrics.slaComplianceRate}%`, sub: "Dentro de SLA", icon: TrendingUp, color: "text-indigo-600" },
            ].map((kpi, i) => (
                <Card key={i} className="rounded-3xl border-none shadow-sm bg-white dark:bg-zinc-900/50 p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <kpi.icon className={cn("w-4 h-4", kpi.color)} />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</span>
                    </div>
                    <div>
                        <p className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">{kpi.value}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">{kpi.sub}</p>
                    </div>
                </Card>
            ))}
        </div>
    );
}

export function SuperadminAlertsList({ alerts }: { alerts: CockpitOperationalAlert[] }) {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [selectedAlert, setSelectedAlert] = useState<CockpitOperationalAlert | null>(null);
    const searchParams = useSearchParams();

    // Client-side instrumentation
    useEffect(() => {
        const fingerprints = alerts.map(a => a.fingerprint);
        const uniqueFp = new Set(fingerprints);
        console.log(`[SuperadminAlertsList] RECEIVED:`, {
            total: alerts.length,
            unique: uniqueFp.size,
            isDuplicated: uniqueFp.size !== alerts.length,
            sample: fingerprints.slice(0, 5)
        });
    }, [alerts]);

    // Filter & Density State
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [severityFilter, setSeverityFilter] = useState<string[]>([]);
    const [slaFilter, setSlaFilter] = useState<string[]>([]);
    const [actionableOnly, setActionableOnly] = useState(true);
    const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        'resolved': true, // Resolved collapsed by default
        'snoozed': false
    });

    // Sync URL params with local state
    useEffect(() => {
        const sev = searchParams.get('severity');
        if (sev) {
            setSeverityFilter([sev.toUpperCase()]);
            setActionableOnly(false); // If specific severity, show all even if snoozed/resolved if they match
        }
        
        const sla = searchParams.get('sla');
        if (sla) {
            setSlaFilter([sla.toUpperCase()]);
            setActionableOnly(false);
        }

        const stat = searchParams.get('status');
        if (stat) {
            setStatusFilter([stat.toUpperCase()]);
            setActionableOnly(false);
        }

        if (!sev && !sla && !stat) {
            // No direct URL filters
        }
    }, [searchParams]);

    if (alerts.length === 0) return (
        <div className="py-12 text-center border-2 border-dashed border-border rounded-[2.5rem] bg-slate-50/50 dark:bg-zinc-900/20">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/30 mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sin incidentes activos en el ecosistema</p>
        </div>
    );

    const handleAction = async (id: string, actionFn: () => Promise<OperationalActionResult<unknown>>) => {
        setLoadingId(id);
        try {
            const res = await actionFn();
            if (res.ok) {
                toast.success("Operación Exitosa", {
                    description: `${res.message} (Trace: ${res.meta.traceId})`
                });
            } else {
                toast.error("Error Operacional", {
                    description: res.message
                });
            }
        } catch {
            toast.error("Fallo de comunicación con el motor de salud");
        } finally {
            setLoadingId(null);
        }
    };

    // Filter Logic
    const filteredAlerts = useMemo(() => {
        return alerts.filter(a => {
            if (!a) return false;
            
            // Actionable Only
            if (actionableOnly && (a.state === 'resolved' || a.state === 'snoozed')) return false;

            // Search
            if (search) {
                const s = search.toLowerCase();
                const inTitle = a.title?.toLowerCase().includes(s);
                const inDesc = a.description?.toLowerCase().includes(s);
                const inRule = a.ruleCode?.toLowerCase().includes(s);
                const inOrg = a.organization?.name?.toLowerCase().includes(s);
                if (!inTitle && !inDesc && !inRule && !inOrg) return false;
            }

            // Status
            if (statusFilter.length > 0 && !statusFilter.includes(a.state.toUpperCase())) return false;

            // Severity
            if (severityFilter.length > 0 && !severityFilter.includes((a.severity || 'info').toUpperCase())) return false;

            // SLA
            if (slaFilter.length > 0 && !slaFilter.includes(a.sla?.status || 'OK')) return false;

            return true;
        });
    }, [alerts, search, statusFilter, severityFilter, slaFilter, actionableOnly]);

    // Grouping Logic - Single Pass Partition (Hotfix v4.6.x)
    const groups = useMemo(() => {
        const partitioned = {
            critical: [] as CockpitOperationalAlert[],
            risk: [] as CockpitOperationalAlert[],
            open: [] as CockpitOperationalAlert[],
            snoozed: [] as CockpitOperationalAlert[],
            resolved: [] as CockpitOperationalAlert[]
        };

        filteredAlerts.forEach(alert => {
            if (!alert) return;

            // Prioridad 1: Resueltas y Pospuestas (estados terminales/pausados en triage visual)
            if (alert.state === 'resolved') {
                partitioned.resolved.push(alert);
                return;
            }
            if (alert.state === 'snoozed') {
                partitioned.snoozed.push(alert);
                return;
            }

            // Prioridad 2: SLA Vencido o Críticas
            if (alert.sla?.status === 'BREACHED' || alert.severity === 'critical') {
                partitioned.critical.push(alert);
                return;
            }

            // Prioridad 3: En Riesgo o Warnings
            if (alert.sla?.status === 'AT_RISK' || alert.severity === 'warning') {
                partitioned.risk.push(alert);
                return;
            }

            // Prioridad 4: Abiertas normales (Info / On Track)
            partitioned.open.push(alert);
        });

        return partitioned;
    }, [filteredAlerts]);

    const toggleSection = (section: string) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const clearFilters = () => {
        setSearch("");
        setStatusFilter([]);
        setSeverityFilter([]);
        setSlaFilter([]);
        setActionableOnly(false);
    };

    const getColors = (severity: string) => {
        if (severity === 'CRITICAL' || severity === 'critical') return 'border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-400';
        if (severity === 'WARNING' || severity === 'warning') return 'border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400';
        return 'border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-400';
    };

    const getIcon = (severity: string, className?: string) => {
        const iconClass = className || "w-5 h-5";
        if (severity === 'CRITICAL' || severity === 'critical') return <ShieldAlert className={iconClass} />;
        if (severity === 'WARNING' || severity === 'warning') return <AlertTriangle className={iconClass} />;
        return <Info className={iconClass} />;
    };

    const StatusBadge = ({ state, snoozedUntil }: { state: string, snoozedUntil?: string | null }) => {
        const base = "text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full border shadow-sm";
        if (state === 'acknowledged') return <Badge className={cn(base, "bg-blue-100 text-blue-700 border-blue-200")}>Visto</Badge>;
        if (state === 'resolved') return <Badge className={cn(base, "bg-emerald-100 text-emerald-700 border-emerald-200")}>Resuelto</Badge>;
        if (state === 'snoozed') return (
            <Badge className={cn(base, "bg-amber-100 text-amber-700 border-amber-200")}>
                Pospuesto {snoozedUntil ? `(Hasta ${new Date(snoozedUntil).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})` : ''}
            </Badge>
        );
        return <Badge className={cn(base, "bg-rose-100 text-rose-700 border-rose-200 animate-pulse")}>Abierto</Badge>;
    };

    const SLABadge = ({ sla }: { sla: CockpitOperationalAlert['sla'] }) => {
        if (!sla) return null;
        const colors = {
            ON_TRACK: "bg-emerald-50 text-emerald-600 border-emerald-100",
            AT_RISK: "bg-amber-50 text-amber-600 border-amber-100",
            BREACHED: "bg-rose-50 text-rose-600 border-rose-200 animate-bounce"
        };
        return (
            <Badge variant="outline" className={cn("text-[7px] font-black uppercase tracking-tighter px-1.5", colors[sla.status as keyof typeof colors])}>
                SLA: {sla.preset} {sla.status === 'BREACHED' ? 'VENCIDO' : `(Vence ${new Date(sla.dueAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})`}
            </Badge>
        );
    };

    const isCompact = density === 'compact';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Filter Bar (Sticky) */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border border-border/50 p-3 rounded-2xl shadow-sm flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar incidente, regla u organización..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 text-[11px] rounded-xl border-border/50 bg-muted/30 focus:bg-background"
                    />
                </div>
                
                <div className="flex items-center gap-2">
                    <Button 
                        variant={actionableOnly ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActionableOnly(!actionableOnly)}
                        className={cn("h-9 rounded-xl text-[10px] font-black uppercase tracking-tight", actionableOnly ? "bg-blue-600" : "")}
                    >
                        {actionableOnly ? <EyeOff className="w-3.5 h-3.5 mr-2" /> : <Filter className="w-3.5 h-3.5 mr-2" />}
                        Solo Accionables
                    </Button>

                    <div className="h-4 w-[1px] bg-border mx-1" />

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
                        className="h-9 w-9 rounded-xl"
                        title={isCompact ? "Modo Cómodo" : "Modo Compacto"}
                    >
                        {isCompact ? <LayoutGrid className="w-4 h-4" /> : <Rows className="w-4 h-4" />}
                    </Button>

                    { (search || statusFilter.length > 0 || severityFilter.length > 0 || slaFilter.length > 0 || actionableOnly) && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={clearFilters}
                            className="h-9 w-9 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                            title="Limpiar Filtros"
                        >
                            <Eraser className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Triage Sections */}
            <div className="space-y-8">
                {Object.entries({
                    critical: { label: "🚨 Críticas / SLA Vencido", color: "text-red-600", bg: "bg-red-50", icon: ShieldAlert },
                    risk: { label: "⚠️ En Riesgo", color: "text-amber-600", bg: "bg-amber-50", icon: AlertTriangle },
                    open: { label: "🔔 Abiertas", color: "text-blue-600", bg: "bg-blue-50", icon: BellRing },
                    snoozed: { label: "⏳ Pospuestas", color: "text-slate-600", bg: "bg-slate-100", icon: Clock },
                    resolved: { label: "✅ Resueltas Recientes", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 }
                }).map(([key, config]) => {
                    const sectionAlerts = groups[key as keyof typeof groups];
                    if (sectionAlerts.length === 0 && !search && key !== 'critical') return null;
                    
                    const isCollapsed = collapsedSections[key];

                    return (
                        <div key={key} className="space-y-4">
                            <button 
                                onClick={() => toggleSection(key)}
                                className="flex items-center justify-between w-full px-4 py-2 hover:bg-muted/50 rounded-xl transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <config.icon className={cn("w-4 h-4", config.color)} />
                                    <h3 className={cn("text-[10px] font-black uppercase tracking-[0.2em]", config.color)}>
                                        {config.label}
                                    </h3>
                                    <Badge variant="secondary" className="rounded-full h-5 px-2 text-[10px] font-black bg-muted/80">
                                        {sectionAlerts.length}
                                    </Badge>
                                </div>
                                {isCollapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
                            </button>

                            {!isCollapsed && (
                                <div className={cn(
                                    "grid gap-4 transition-all animate-in fade-in slide-in-from-top-2",
                                    isCompact ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 lg:grid-cols-2"
                                )}>
                                    {sectionAlerts.length === 0 ? (
                                        <div className="col-span-full py-8 text-center border border-dashed border-border rounded-[2rem] bg-muted/10 opacity-50 italic text-[10px] font-medium">
                                            No hay alertas en esta categoría
                                        </div>
                                    ) : sectionAlerts.map((alert, idx) => {
                                        if (!alert) return null;
                                        const isSnoozed = alert.state === 'snoozed';
                                        const isLoading = loadingId === alert.id;
                                        const ownerLabel = alert.owner ? (alert.owner.ownerId || alert.owner.ownerRole) : "Sin asignar";

                                        return (
                                            <Card key={alert.fingerprint || alert.id || `alert-${key}-${idx}`} className={cn(
                                                "rounded-[2rem] border transition-all overflow-hidden relative group",
                                                getColors(alert.severity || 'info'),
                                                isSnoozed && "opacity-60 grayscale-[0.5]",
                                                isCompact ? "p-4" : "p-0"
                                            )}>
                                                {/* FORENSIC DEBUG LABEL */}
                                                <div className="absolute top-0 right-0 px-2 py-0.5 text-[8px] bg-black/80 text-white font-mono z-50 rounded-bl-lg whitespace-nowrap overflow-hidden">
                                                    DBG-GRID fp:{alert.fingerprint?.slice(-8) || 'N/A'} | id:{alert.id?.slice(-8) || 'N/A'} | sem:{alert.fingerprint?.split(':')[0]?.slice(-5)}:{alert.fingerprint?.split(':')[1]} | grp:{key} | key:{alert.fingerprint || alert.id || `alert-${key}-${idx}`} | org:{alert.organization?.name?.slice(0,5) || 'N/A'}
                                                </div>
                                                <CardContent className={cn("p-0 flex gap-4", !isCompact && "p-6 gap-5")}>
                                                    <div className={cn("shrink-0", !isCompact && "mt-1")}>
                                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin opacity-50" /> : 
                                                         getIcon(alert.severity || 'info', isCompact ? "w-4 h-4" : "w-5 h-5")}
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex flex-col min-w-0">
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <p className={cn("font-black uppercase tracking-tight truncate", isCompact ? "text-[11px]" : "text-[13px]")}>
                                                                        {alert.title || 'Alerta Sin Título'}
                                                                    </p>
                                                                    {!isCompact && <StatusBadge state={alert.state} snoozedUntil={alert.snoozedUntil} />}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[8px] font-mono uppercase opacity-50 tracking-tighter">{alert.ruleCode}</span>
                                                                    <SLABadge sla={alert.sla} />
                                                                </div>
                                                            </div>
                                                            {isCompact && <StatusBadge state={alert.state} snoozedUntil={alert.snoozedUntil} />}
                                                        </div>
                                                        
                                                        {!isCompact && (
                                                            <p className="text-[11px] leading-relaxed opacity-80 font-medium italic line-clamp-2">
                                                                {alert.description || 'Sin descripción detallada.'}
                                                            </p>
                                                        )}
                                                        
                                                        <div className={cn(
                                                            "flex items-center justify-between pt-2 border-t border-current/10 mt-1",
                                                            isCompact && "pt-1 border-none mt-0"
                                                        )}>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex items-center gap-1.5 bg-current/5 px-2 py-0.5 rounded-full">
                                                                    <User className="w-2 h-2 opacity-50" />
                                                                    <span className="text-[7px] font-black uppercase opacity-70 truncate max-w-[60px]">{ownerLabel}</span>
                                                                </div>
                                                                {alert.href && !isCompact && (
                                                                    <Link href={alert.href}>
                                                                        <span className="text-[8px] font-black text-blue-600 hover:underline flex items-center gap-1 cursor-pointer group-hover:translate-x-0.5 transition-transform">
                                                                            <ExternalLink className="w-2.5 h-2.5" />
                                                                            Contexto
                                                                        </span>
                                                                    </Link>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-1">
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    onClick={() => setSelectedAlert(alert)}
                                                                    className={cn("h-6 px-2 text-[8px] font-black uppercase tracking-tight bg-current/5 hover:bg-current/10", !isCompact && "h-7 px-3 text-[9px]")}
                                                                >
                                                                    <ClipboardList className="w-3 h-3 mr-1" />
                                                                    {isCompact ? "" : "Playbook"}
                                                                </Button>
                                                                
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger disabled={isLoading} asChild>
                                                                        <Button variant="ghost" size="icon" className={cn("h-6 w-6 rounded-lg hover:bg-current/10 transition-colors", !isCompact && "h-7 w-7")}>
                                                                            <MoreVertical className="w-3 h-3" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-border shadow-2xl">
                                                                        {alert.state === 'open' && (
                                                                            <DropdownMenuItem 
                                                                                onClick={() => handleAction(alert.id, () => acknowledgeCockpitAlert(alert.fingerprint))}
                                                                                className="rounded-xl cursor-pointer flex items-center gap-2 p-2.5"
                                                                            >
                                                                                <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                                                                                <span className="text-xs font-black uppercase">Acusar Recibo</span>
                                                                            </DropdownMenuItem>
                                                                        )}

                                                                        <DropdownMenuItem 
                                                                            onClick={() => {
                                                                                const user = prompt("ID del usuario responsable:");
                                                                                if (user) handleAction(alert.id, () => assignCockpitAlertOwner(alert.fingerprint, "user", user));
                                                                            }}
                                                                            className="rounded-xl cursor-pointer flex items-center gap-2 p-2.5"
                                                                        >
                                                                            <Target className="w-3.5 h-3.5 text-indigo-500" />
                                                                            <span className="text-xs font-black uppercase">Asignar Responsable</span>
                                                                        </DropdownMenuItem>
                                                                        
                                                                        <DropdownMenuSeparator />
                                                                        <div className="px-2 py-1.5 text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]">Posponer</div>
                                                                        <DropdownMenuItem 
                                                                            onClick={() => handleAction(alert.id, () => snoozeCockpitAlert(alert.fingerprint, "1h"))}
                                                                            className="rounded-xl cursor-pointer flex items-center gap-2 p-2.5"
                                                                        >
                                                                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                                                                            <span className="text-xs font-black uppercase tracking-tight">Por 1 Hora</span>
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem 
                                                                            onClick={() => handleAction(alert.id, () => snoozeCockpitAlert(alert.fingerprint, "24h"))}
                                                                            className="rounded-xl cursor-pointer flex items-center gap-2 p-2.5"
                                                                        >
                                                                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                                            <span className="text-xs font-black uppercase tracking-tight">Por 24 Horas</span>
                                                                        </DropdownMenuItem>

                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem 
                                                                            onClick={() => {
                                                                                const note = prompt("Nota de resolución (opcional):");
                                                                                if (note !== null) handleAction(alert.id, () => resolveCockpitAlert(alert.fingerprint, note));
                                                                            }}
                                                                            className="rounded-xl cursor-pointer flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-900/20"
                                                                        >
                                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                            <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400">Marcar Resuelto</span>
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Empty Result for filters */}
            {filteredAlerts.length === 0 && alerts.length > 0 && (
                <div className="py-20 text-center border-2 border-dashed border-border rounded-[3rem] bg-slate-50/30">
                    <Filter className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-50" />
                    <h3 className="text-sm font-black uppercase text-slate-500 tracking-widest">Sin resultados para estos filtros</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 italic uppercase">Intenta ajustar tu búsqueda o limpiar los filtros activos</p>
                    <Button 
                        variant="outline" 
                        onClick={clearFilters}
                        className="mt-6 rounded-2xl text-[10px] font-black uppercase px-6"
                    >
                        Limpiar Todos los Filtros
                    </Button>
                </div>
            )}

            {/* Playbook Modal */}
            <Modal title="Ejecución de Playbook" isOpen={!!selectedAlert} onClose={() => setSelectedAlert(null)}>
                <div className="max-w-2xl w-full">
                    {selectedAlert && (
                        <PlaybookExecutionPanel 
                            alert={selectedAlert} 
                            onClose={() => setSelectedAlert(null)} 
                        />
                    )}
                </div>
            </Modal>
        </div>
    );
}

function PlaybookExecutionPanel({ alert, onClose }: { alert: CockpitOperationalAlert, onClose: () => void }) {
    const playbook = getPlaybookByRule(alert.ruleCode);
    const [acting, setActing] = useState<string | null>(null);

    const toggleStep = async (stepId: string, checked: boolean) => {
        setActing(stepId);
        try {
            const res = await toggleCockpitPlaybookStep(alert.fingerprint, stepId, checked);
            if (res.ok) {
                toast.success("Checklist actualizado");
            }
        } finally {
            setActing(null);
        }
    };

    return (
        <div className="flex flex-col space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-[3rem] shadow-2xl relative">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
            </button>

            <div>
                <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-black uppercase italic">Playbook</Badge>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{alert.ruleCode}</span>
                </div>
                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">{playbook.title}</h2>
                <p className="text-sm font-medium italic leading-relaxed pt-2 text-slate-500">
                    {playbook.summary}
                </p>
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar max-h-[60vh]">
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                        <ClipboardList className="w-3.5 h-3.5" />
                        Pasos de Remediación
                    </h4>
                    
                    <div className="space-y-3">
                        {playbook.steps.map((step) => {
                            const execution = alert.playbookSteps?.find(s => s.stepId === step.id);
                            const isChecked = execution?.checked || false;
                            const isActing = acting === step.id;

                            return (
                                <div key={step.id} className={cn(
                                    "p-5 rounded-3xl border transition-all flex gap-4 items-start group",
                                    isChecked ? "bg-emerald-50/50 border-emerald-100" : "bg-slate-50 border-slate-100 hover:border-blue-200"
                                )}>
                                    <div className="pt-1">
                                        {isActing ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                        ) : (
                                            <input 
                                                type="checkbox"
                                                checked={isChecked} 
                                                onChange={(e) => toggleStep(step.id, e.target.checked)}
                                                className="w-5 h-5 rounded-lg border-slate-300 text-emerald-500 focus:ring-emerald-500"
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-xs font-black uppercase tracking-tight",
                                            isChecked && "line-through opacity-40 text-emerald-700"
                                        )}>
                                            {step.title}
                                        </p>
                                        <p className="text-[10px] font-medium text-slate-500 mt-1 italic">
                                            {step.description}
                                        </p>
                                        {isChecked && execution?.checkedBy && (
                                            <p className="text-[8px] font-bold text-emerald-600 mt-2 uppercase tracking-widest flex items-center gap-1">
                                                <CheckCircle2 className="w-2.5 h-2.5" />
                                                Completado por {execution.checkedBy.split('@')[0]}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6 rounded-[2.5rem] bg-indigo-50 border border-indigo-100 space-y-3 dark:bg-indigo-900/20 dark:border-indigo-800">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Información de Contexto
                    </h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-indigo-900/40 dark:text-indigo-100/40 uppercase">Incidente:</span>
                            <span className="font-black text-indigo-900 dark:text-indigo-100 font-mono">{alert.fingerprint.split(':').pop()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-indigo-900/40 dark:text-indigo-100/40 uppercase">SLA Sugerido:</span>
                            <span className="font-black text-indigo-900 dark:text-indigo-100">{playbook.defaultSlaPreset}</span>
                        </div>
                        {alert.href && (
                            <Link href={alert.href}>
                                <Button className="w-full mt-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase h-9">
                                    Explorar Objeto Afectado
                                    <ChevronRight className="w-3 h-3 ml-2" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-border flex justify-end">
                <Button variant="outline" onClick={onClose} className="rounded-2xl text-[10px] font-black uppercase h-10 px-8">
                    Cerrar Panel
                </Button>
            </div>
        </div>
    );
}

// Separate component for Metrics Chart
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyMetrics } from "@/lib/superadmin/metrics-service";

export function SuperadminMonthlyMetrics({ data = [] }: { data: MonthlyMetrics[] }) {
    const safeData = Array.isArray(data) ? data : [];
    return (
        <Card className="rounded-3xl border-border shadow-xl bg-card overflow-hidden transition-all hover:shadow-2xl">
            <CardHeader className="p-6 bg-muted/20 border-b border-border flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        Rendimiento Mensual TechWise
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-tight">Métricas Agregadas (Ingresos y Crecimiento)</p>
                </div>
            </CardHeader>
            <CardContent className="p-8">
                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={safeData} margin={{ top: 20, right: 0, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: '900', fill: 'currentColor', opacity: 0.5 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: '900', fill: 'currentColor', opacity: 0.5 }}
                                dx={-5}
                            />
                            <Tooltip
                                cursor={{ fill: 'currentColor', opacity: 0.03 }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload as MonthlyMetrics;
                                        return (
                                            <div className="bg-zinc-900 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200">
                                                <p className="text-[10px] font-black text-white mb-3 uppercase tracking-widest border-b border-white/10 pb-2">{d?.month || '---'}</p>
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between gap-6">
                                                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Venta Neta:</span>
                                                        <span className="text-xs font-black text-emerald-400 font-mono">${(d?.revenue || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-6">
                                                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Nuevas Orgs:</span>
                                                        <span className="text-xs font-black text-blue-400">+{d?.newOrgs || 0}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-6">
                                                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Pagos Fallidos:</span>
                                                        <span className="text-xs font-black text-rose-500">{d?.failedPayments || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar
                                dataKey="revenue"
                                radius={[8, 8, 8, 8]}
                                barSize={45}
                            >
                                {safeData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={index === safeData.length - 1 ? 'url(#activeGradient)' : 'url(#baseGradient)'}
                                        className="transition-all duration-500"
                                    />
                                ))}
                            </Bar>
                            <defs>
                                <linearGradient id="baseGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.1" />
                                </linearGradient>
                                <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
                                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.8" />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
