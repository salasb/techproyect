"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
    ShieldAlert, AlertTriangle, Info, CheckCircle2, ExternalLink, 
    MoreVertical, Clock, CheckCheck, BellRing, Loader2, 
    User, Target, ClipboardList, AlertOctagon, TrendingUp,
    Timer, CheckCircle, ChevronRight, X, Filter, Search, 
    LayoutGrid, Rows, ChevronDown, ChevronUp, Eraser, EyeOff,
    ShieldCheck, Zap, Building2, Globe
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    acknowledgeCockpitAlert, snoozeCockpitAlert, resolveCockpitAlert, 
    assignCockpitAlertOwner, toggleCockpitPlaybookStep,
    bulkAcknowledgeCockpitAlerts, bulkSnoozeCockpitAlerts, bulkResolveCockpitAlerts,
    logPlaybookOpenedAction, resetCockpitPlaybookAction
} from "@/app/actions/superadmin-v2";
import type { CockpitOperationalAlert, OperationalActionResult, CockpitAlertGroup } from "@/lib/superadmin/cockpit-data-adapter";
import type { OperationalMetrics } from "@/lib/superadmin/cockpit-service";
import type { MonthlyMetrics } from "@/lib/superadmin/metrics-service";
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
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Triage Panel - Right Side Sticky
 */
export function SuperadminTriagePanel({ 
    stats,
    currentScope,
    includeNonProductive
}: { 
    stats: { total: number; open: number; critical: number; breached: number; snoozed: number },
    currentScope?: string,
    includeNonProductive?: boolean
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
                <h4 className="text-[9px] font-black uppercase text-indigo-300 tracking-widest">Filtros de Alcance</h4>
                <div className="grid grid-cols-1 gap-2">
                    <Button variant="ghost" className={cn("w-full justify-start text-[10px] font-black uppercase h-10 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white border-none transition-all", (!includeNonProductive && currentScope !== 'production_with_trial') && "bg-indigo-500 shadow-lg")} asChild>
                        <Link href="?scopeMode=production_only" className="w-full">
                            <ShieldCheck className="w-3.5 h-3.5 mr-3" />
                            Solo Producción
                        </Link>
                    </Button>
                    <Button variant="ghost" className={cn("w-full justify-start text-[10px] font-black uppercase h-10 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white border-none transition-all", currentScope === 'production_with_trial' && "bg-indigo-600 shadow-lg")} asChild>
                        <Link href="?scopeMode=production_with_trial" className="w-full">
                            <Globe className="w-3.5 h-3.5 mr-3" />
                            Producción + Trial
                        </Link>
                    </Button>
                    <Button variant="ghost" className={cn("w-full justify-start text-[10px] font-black uppercase h-10 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white border-none transition-all", includeNonProductive && "bg-amber-600 shadow-lg")} asChild>
                        <Link href="?includeNonProductive=1&scopeMode=all" className="w-full">
                            <Zap className="w-3.5 h-3.5 mr-3" />
                            Modo Diagnóstico
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

/**
 * Operational KPIs - Top Bar
 */
export function SuperadminOperationalKPIs({ 
    metrics, 
    hygiene,
    isDiagnosticMode = false
}: { 
    metrics: OperationalMetrics & { affectedOrgs?: number },
    hygiene?: { hiddenByEnvironmentFilter: number },
    isDiagnosticMode?: boolean
}) {
    const hiddenCount = hygiene?.hiddenByEnvironmentFilter || 0;

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {/* KPI 1: Open Incidents */}
            <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-zinc-900/50 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                    <BellRing className="w-4 h-4 text-rose-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {isDiagnosticMode ? "Abiertas (diagnóstico)" : "Abiertas (operacionales)"}
                    </span>
                </div>
                <div>
                    <p className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">{metrics.openAlerts}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight flex items-center justify-between">
                        {isDiagnosticMode ? `Operacionales: ${metrics.openAlerts - hiddenCount}` : `Ocultas por higiene: ${hiddenCount}`}
                        {!isDiagnosticMode && hiddenCount > 0 && (
                            <Link href="?includeNonProductive=1&scopeMode=all" className="text-indigo-500 hover:underline">Ver diagnóstico</Link>
                        )}
                    </p>
                </div>
            </Card>

            {/* KPI 2: Breached SLA */}
            <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-zinc-900/50 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                    <AlertOctagon className="w-4 h-4 text-orange-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fuera de SLA</span>
                </div>
                <div>
                    <p className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">{metrics.breachedAlerts}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Scope: {isDiagnosticMode ? "Diagnóstico" : "Producción"}</p>
                </div>
            </Card>

            {/* KPI 3: Compliance */}
            <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-zinc-900/50 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dentro de SLA</span>
                </div>
                <div>
                    <p className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">{metrics.slaComplianceRate}%</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Base: {metrics.openAlerts} incidentes</p>
                </div>
            </Card>

            {/* KPI 4: Orgs Affected */}
            <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-zinc-900/50 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Orgs afectadas</span>
                </div>
                <div>
                    <p className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">{metrics.affectedOrgs || 0}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Scope: {isDiagnosticMode ? "Diagnóstico" : "Producción"}</p>
                </div>
            </Card>

            {/* KPI 5: MTTR */}
            <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-zinc-900/50 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                    <Timer className="w-4 h-4 text-emerald-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MTTR Promedio</span>
                </div>
                <div>
                    <p className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">{metrics.mttrHours}h</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Tiempo resolución</p>
                </div>
            </Card>
        </div>
    );
}

/**
 * Main Alerts List Component (v4.7.2)
 */
export function SuperadminAlertsList({ 
    alerts,
    alertGroups
}: { 
    alerts: CockpitOperationalAlert[],
    alertGroups: CockpitAlertGroup[]
}) {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [selectedAlert, setSelectedAlert] = useState<CockpitOperationalAlert | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<CockpitAlertGroup | null>(null);
    const searchParams = useSearchParams();

    // View Mode State
    const [viewMode, setViewMode] = useState<'grouped' | 'individual'>('grouped');

    const closePlaybook = () => {
        setSelectedAlert(null);
        setSelectedGroup(null);
    };
    
    useEffect(() => {
        const saved = localStorage.getItem('cockpit_view_mode');
        if (saved === 'individual') setViewMode('individual');
    }, []);

    const toggleViewMode = () => {
        const next = viewMode === 'grouped' ? 'individual' : 'grouped';
        setViewMode(next);
        localStorage.setItem('cockpit_view_mode', next);
    };

    // Filter & Density State
    const [search, setSearch] = useState("");
    const [actionableOnly, setActionableOnly] = useState(true);
    const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        'resolved': true,
        'snoozed': false
    });
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const clearFilters = () => {
        setSearch("");
        setActionableOnly(false);
    };

    const handleAction = async (id: string, actionFn: () => Promise<OperationalActionResult<unknown>>) => {
        setLoadingId(id);
        try {
            const res = await actionFn();
            if (res.ok) {
                toast.success("Operación Exitosa", {
                    description: `${res.message} (Trace: ${res.meta.traceId})`
                });
            } else {
                toast.error("Error Operacional", { description: res.message });
            }
        } catch {
            toast.error("Fallo de comunicación");
        } finally {
            setLoadingId(null);
        }
    };

    const handleBulkAction = async (groupKey: string, actionFn: () => Promise<OperationalActionResult<unknown>>) => {
        setLoadingId(groupKey);
        try {
            const res = await actionFn();
            if (res.ok) {
                toast.success("Acción Masiva Completada", {
                    description: `${res.message} — Trace: ${res.meta.traceId}`,
                    duration: 5000
                });
            } else {
                toast.error("Fallo en Acción Masiva", { description: res.message });
            }
        } catch {
            toast.error("Error en comandos masivos");
        } finally {
            setLoadingId(null);
        }
    };

    // Filter Logic
    const filteredAlerts = useMemo(() => {
        return alerts.filter(a => {
            if (!a) return false;
            if (actionableOnly && (a.state === 'resolved' || a.state === 'snoozed')) return false;
            if (search) {
                const s = search.toLowerCase();
                const inTitle = a.title?.toLowerCase().includes(s);
                const inOrg = a.organization?.name?.toLowerCase().includes(s);
                if (!inTitle && !inOrg) return false;
            }
            return true;
        });
    }, [alerts, search, actionableOnly]);

    // Grouping Logic (Filtered)
    const activeGroups = useMemo(() => {
        if (viewMode === 'individual') return [];
        const filteredIds = new Set(filteredAlerts.map(a => a.id));
        return alertGroups.map(g => {
            const filteredItems = g.items.filter(item => filteredIds.has(item.id));
            if (filteredItems.length === 0) return null;
            return { ...g, count: filteredItems.length, items: filteredItems };
        }).filter(Boolean) as CockpitAlertGroup[];
    }, [alertGroups, filteredAlerts, viewMode]);

    const sections = {
        critical: { label: "🚨 Críticas / SLA Vencido", color: "text-red-600", bg: "bg-red-50", icon: ShieldAlert },
        risk: { label: "⚠️ En Riesgo", color: "text-amber-600", bg: "bg-amber-50", icon: AlertTriangle },
        open: { label: "🔔 Abiertas", color: "text-blue-600", bg: "bg-blue-50", icon: BellRing },
        snoozed: { label: "⏳ Pospuestas", color: "text-slate-600", bg: "bg-slate-100", icon: Clock },
        resolved: { label: "✅ Resueltas Recientes", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 }
    };

    const isCompact = density === 'compact';
    const isDiagnosticMode = searchParams.get('scopeMode') === 'all';
    const currentScope = searchParams.get('scopeMode') || 'production_only';
    const scopeLabel = isDiagnosticMode ? "Diagnóstico (incluye Test/Demo/QA)" : 
                      currentScope === 'production_with_trial' ? "Producción + Trial" : "Solo producción";

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Filter Bar */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border border-border/50 p-3 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar incidente u organización..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9 text-[11px] rounded-xl border-border/50 bg-muted/30 focus:bg-background"
                        />
                    </div>
                    
                    <TooltipProvider>
                        <UITooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="secondary" className="h-9 px-3 rounded-xl border-indigo-100 bg-indigo-50/50 text-indigo-700 font-bold text-[10px] gap-2 cursor-help">
                                    <Globe className="w-3 h-3" />
                                    Scope: {scopeLabel}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-white border-none p-3 rounded-xl shadow-2xl max-w-xs">
                                <p className="text-xs font-medium leading-relaxed">Este scope aplica a KPIs, triage, grupos y directorio global.</p>
                            </TooltipContent>
                        </UITooltip>
                    </TooltipProvider>

                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={toggleViewMode}
                        className="h-9 rounded-xl text-[10px] font-black uppercase tracking-tight gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                        {viewMode === 'grouped' ? <LayoutGrid className="w-3.5 h-3.5" /> : <Rows className="w-3.5 h-3.5" />}
                        Vista: {viewMode === 'grouped' ? 'Agrupada' : 'Individual'}
                    </Button>
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
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
                        className="h-9 w-9 rounded-xl"
                    >
                        {isCompact ? <LayoutGrid className="w-4 h-4" /> : <Rows className="w-4 h-4" />}
                    </Button>
                    { (search || actionableOnly === false) && (
                        <Button variant="ghost" size="icon" onClick={clearFilters} className="h-9 w-9 rounded-xl text-rose-500">
                            <Eraser className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Grid Sections */}
            <div className="space-y-8">
                {Object.entries(sections).map(([secKey, config]) => {
                    const sectionAlerts = filteredAlerts.filter(a => {
                        if (secKey === 'resolved') return a.state === 'resolved';
                        if (secKey === 'snoozed') return a.state === 'snoozed';
                        if (secKey === 'critical') return a.severity === 'critical' || a.sla?.status === 'BREACHED';
                        if (secKey === 'risk') return a.severity === 'warning' || a.sla?.status === 'AT_RISK';
                        return a.state === 'open' || a.state === 'acknowledged';
                    });

                    const sectionGroups = activeGroups.filter(g => {
                        if (secKey === 'resolved') return g.operationalState === 'resolved';
                        if (secKey === 'snoozed') return g.operationalState === 'snoozed';
                        if (secKey === 'critical') return g.severity === 'critical' || g.worstSlaStatus === 'BREACHED';
                        if (secKey === 'risk') return g.severity === 'warning' || g.worstSlaStatus === 'AT_RISK';
                        return g.operationalState === 'open' || g.operationalState === 'acknowledged';
                    });

                    const totalInSec = viewMode === 'grouped' ? sectionGroups.length : sectionAlerts.length;
                    
                    if (totalInSec === 0 && !search && secKey !== 'critical') return null;

                    return (
                        <div key={secKey} className="space-y-4">
                            <button 
                                onClick={() => setCollapsedSections(p => ({ ...p, [secKey]: !p[secKey] }))}
                                className="flex items-center justify-between w-full px-4 py-2 hover:bg-muted/50 rounded-xl transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <config.icon className={cn("w-4 h-4", config.color)} />
                                    <h3 className={cn("text-[10px] font-black uppercase tracking-[0.2em]", config.color)}>{config.label}</h3>
                                    <Badge variant="secondary" className="rounded-full h-5 px-2 text-[10px] font-black">{totalInSec}</Badge>
                                </div>
                                {collapsedSections[secKey] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>

                            {!collapsedSections[secKey] && (
                                <div className={cn("grid gap-4", isCompact ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 lg:grid-cols-2")}>
                                    {totalInSec === 0 ? (
                                        <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-[2.5rem] bg-slate-50/20">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sin incidentes operacionales.</p>
                                        </div>
                                    ) : viewMode === 'grouped' ? (
                                        sectionGroups.map(group => (
                                            <AlertGroupCard 
                                                key={group.groupKey} 
                                                group={group} 
                                                isCompact={isCompact}
                                                onBulkAction={handleBulkAction}
                                                onExpand={() => setExpandedGroups(p => ({ ...p, [group.groupKey]: !p[group.groupKey] }))}
                                                isExpanded={expandedGroups[group.groupKey]}
                                                onIndividualAction={handleAction}
                                                loadingId={loadingId}
                                                onSelectPlaybook={(group) => setSelectedGroup(group)}
                                                onSelectIndividualPlaybook={(alert) => setSelectedAlert(alert)}
                                            />
                                        ))
                                    ) : (
                                        sectionAlerts.map(alert => (
                                            <AlertIndividualCard 
                                                key={alert.id} 
                                                alert={alert} 
                                                isCompact={isCompact} 
                                                onAction={handleAction}
                                                loading={loadingId === alert.id}
                                                onSelectPlaybook={() => setSelectedAlert(alert)}
                                            />
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Empty Search Result */}
            {filteredAlerts.length === 0 && alerts.length > 0 && (
                <div className="py-20 text-center border-2 border-dashed border-border rounded-[3rem] bg-slate-50/30">
                    <Filter className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-50" />
                    <h3 className="text-sm font-black uppercase text-slate-500 tracking-widest">No hay resultados para este filtro.</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 italic uppercase">Intenta ajustar tu búsqueda o limpiar los filtros activos</p>
                    <Button variant="outline" onClick={clearFilters} className="mt-6 rounded-2xl text-[10px] font-black uppercase px-6">Limpiar Filtros</Button>
                </div>
            )}

            {/* Playbook Modal */}
            <Modal title="Ejecución de Playbook" isOpen={!!selectedAlert || !!selectedGroup} onClose={closePlaybook}>
                <div className="max-w-2xl w-full">
                    {(selectedAlert || selectedGroup) && (
                        <PlaybookExecutionPanel 
                            alert={selectedAlert || selectedGroup!.items[0]} 
                            group={selectedGroup}
                            onClose={closePlaybook} 
                        />
                    )}
                </div>
            </Modal>
        </div>
    );
}

function AlertGroupCard({ 
    group, 
    isCompact, 
    onBulkAction, 
    onExpand, 
    isExpanded,
    onIndividualAction,
    loadingId,
    onSelectPlaybook,
    onSelectIndividualPlaybook
}: { 
    group: CockpitAlertGroup, 
    isCompact: boolean, 
    onBulkAction: (key: string, fn: any) => Promise<void>,
    onExpand: () => void,
    isExpanded: boolean,
    onIndividualAction: (id: string, fn: any) => Promise<void>,
    loadingId: string | null,
    onSelectPlaybook: (group: CockpitAlertGroup) => void,
    onSelectIndividualPlaybook: (alert: CockpitOperationalAlert) => void
}) {
    const severityColor = group.severity === 'critical' ? 'text-red-600' : group.severity === 'warning' ? 'text-amber-600' : 'text-blue-600';
    const isLoading = loadingId === group.groupKey;

    return (
        <Card className={cn("rounded-[2.5rem] border-2 transition-all shadow-sm overflow-hidden", isExpanded ? "col-span-full border-indigo-500/30" : "hover:border-indigo-500/20")}>
            <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4 min-w-0">
                        <div className={cn("p-3 rounded-2xl bg-muted/50", severityColor)}>
                            {group.severity === 'critical' ? <ShieldAlert className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-black uppercase tracking-tight text-sm truncate italic">{group.title}</h4>
                            <div className="mt-1">
                                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-tight">
                                    {group.orgCount} organizaciones · {group.count} incidentes
                                </p>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                    Último: {new Date(group.newestAt || "").toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} · SLA peor: {group.worstSlaStatus || "OK"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                {group.organizationsPreview.map(org => (
                                    <Badge key={org.orgId} variant="outline" className="text-[7px] font-bold opacity-60 bg-white/50">{org.orgName}</Badge>
                                ))}
                                {group.orgCount > 3 && <span className="text-[7px] font-bold opacity-40">+{group.orgCount - 3} más</span>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild disabled={isLoading}>
                                <Button variant="outline" size="sm" className="h-8 rounded-xl text-[9px] font-black uppercase">Acciones masivas</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl">
                                <DropdownMenuItem onClick={() => onSelectPlaybook(group)} className="rounded-xl flex items-center gap-2 p-2.5 bg-indigo-50 text-indigo-700 font-black uppercase tracking-tight mb-2 border border-indigo-100">
                                    <ClipboardList className="w-3.5 h-3.5" />
                                    Abrir Playbook Base
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onBulkAction(group.groupKey, () => bulkAcknowledgeCockpitAlerts(group.itemIds))} className="rounded-xl flex items-center gap-2 p-2.5">
                                    <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                                    <span className="text-xs font-black uppercase">Acusar recibo a todos</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={async () => {
                                    const note = prompt("Nota de resolución masiva:");
                                    if (note) await onBulkAction(group.groupKey, () => bulkResolveCockpitAlerts(group.itemIds, note));
                                }} className="rounded-xl flex items-center gap-2 p-2.5 bg-emerald-50 text-emerald-700">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-xs font-black uppercase">Resolver todos</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant={isExpanded ? "default" : "secondary"} size="sm" onClick={onExpand} className="h-8 rounded-xl text-[9px] font-black uppercase">
                            {isExpanded ? "Cerrar" : "Ver casos"}
                        </Button>
                    </div>
                </div>

                {isExpanded && (
                    <div className="mt-8 pt-6 border-t border-dashed grid gap-4 animate-in slide-in-from-top-4 duration-300 grid-cols-1 lg:grid-cols-2">
                        {group.items.map(item => (
                            <AlertIndividualCard 
                                key={item.id} 
                                alert={item} 
                                isCompact={true} 
                                onAction={onIndividualAction}
                                loading={loadingId === item.id}
                                onSelectPlaybook={() => onSelectIndividualPlaybook(item)}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function AlertIndividualCard({ alert, onAction, loading, onSelectPlaybook }: { alert: CockpitOperationalAlert, isCompact: boolean, onAction: any, loading: boolean, onSelectPlaybook: () => void }) {
    const ownerLabel = alert.owner ? (alert.owner.ownerId || alert.owner.ownerRole) : "Sin asignar";
    
    return (
        <Card className={cn(
            "rounded-[2rem] border transition-all relative group overflow-hidden shadow-sm",
            alert.severity === 'critical' ? 'bg-red-50/30 border-red-100' : alert.severity === 'warning' ? 'bg-amber-50/30 border-amber-100' : 'bg-blue-50/30 border-blue-100'
        )}>
            <div className="absolute top-0 right-0 px-2 py-0.5 text-[7px] bg-black/80 text-white font-mono z-10 rounded-bl-lg">
                {alert.environmentClass?.toUpperCase()} | {alert.fingerprint.slice(-8)}
            </div>
            <CardContent className="p-5 flex gap-4 items-start">
                <div className="shrink-0 mt-1">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin opacity-50" /> : 
                     alert.severity === 'critical' ? <ShieldAlert className="w-4 h-4 text-red-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <p className="font-black uppercase text-xs truncate italic">{alert.organization?.name || 'Org unknown'}</p>
                        <Badge variant="outline" className="text-[7px] font-bold">{alert.state.toUpperCase()}</Badge>
                    </div>
                    <p className="text-[10px] font-medium opacity-70 mt-1 line-clamp-1">{alert.title}</p>
                    
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5">
                        <div className="flex items-center gap-2">
                            <User className="w-2.5 h-2.5 opacity-40" />
                            <span className="text-[8px] font-bold opacity-50 uppercase">{ownerLabel}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={onSelectPlaybook} className="h-6 text-[8px] font-black uppercase px-2 hover:bg-indigo-100">Playbook</Button>
                            {alert.state === 'open' && (
                                <Button variant="ghost" size="sm" onClick={() => onAction(alert.id, () => acknowledgeCockpitAlert(alert.fingerprint))} className="h-6 text-[8px] font-black uppercase px-2 hover:bg-blue-100">ACK</Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => onAction(alert.id, () => snoozeCockpitAlert(alert.fingerprint, "24h"))} className="h-6 text-[8px] font-black uppercase px-2 hover:bg-amber-100">SNOOZE</Button>
                            {alert.href && (
                                <Link href={alert.href}>
                                    <Button variant="ghost" size="sm" className="h-6 text-[8px] font-black uppercase px-2 hover:bg-slate-100">GOTO</Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function PlaybookExecutionPanel({ alert, group, onClose }: { alert: CockpitOperationalAlert, group?: CockpitAlertGroup | null, onClose: () => void }) {
    const playbook = getPlaybookByRule(alert.ruleCode);
    const [acting, setActing] = useState<string | null>(null);

    useEffect(() => {
        logPlaybookOpenedAction(alert.fingerprint);
    }, [alert.fingerprint]);

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
                <div className="mb-4">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Contexto:</p>
                    <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-black uppercase tracking-tight italic">{alert.organization?.name || "Organización Global"}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-black uppercase italic">Playbook</Badge>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{alert.ruleCode}</span>
                    </div>
                    {group && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] font-black uppercase">
                            Impacto: {group.orgCount} orgs / {group.count} incidentes
                        </Badge>
                    )}
                </div>
                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">{playbook.title}</h2>
                {group && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {group.organizationsPreview.map(o => (
                            <Badge key={o.orgId} variant="outline" className="text-[8px] font-bold bg-slate-50 border-slate-200">{o.orgName}</Badge>
                        ))}
                        {group.orgCount > 3 && <span className="text-[8px] text-slate-400 font-bold">+{group.orgCount - 3} más</span>}
                    </div>
                )}
                <p className="text-sm font-medium italic leading-relaxed pt-2 text-slate-500">
                    {playbook.summary}
                </p>
            </div>

            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar max-h-[60vh]">
                {/* Progress Bar v4.8.0 */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Progreso de Remediación</span>
                        <span className="text-blue-600 font-mono">{alert.playbookSteps?.filter(s => s.checked).length || 0} / {playbook.steps.length}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                        <div 
                            className="bg-blue-600 h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                            style={{ width: `${((alert.playbookSteps?.filter(s => s.checked).length || 0) / playbook.steps.length) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                            <ClipboardList className="w-3.5 h-3.5" />
                            Pasos de Remediación
                        </span>
                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-mono">
                            {alert.playbookSteps?.filter(s => s.checked).length || 0} / {playbook.steps.length} completados
                        </span>
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
                                        
                                        {/* Acciones y Deeplinks según contrato v4.8.0 */}
                                        {step.actionType === 'deeplink' && alert.href && !isChecked && (
                                            <div className="mt-3">
                                                <Button variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100" asChild>
                                                    <Link href={alert.href} target="_blank">
                                                        <ExternalLink className="w-3 h-3 mr-2" />
                                                        Abrir Contexto Relacionado
                                                    </Link>
                                                </Button>
                                            </div>
                                        )}

                                        {step.evidenceHint && !isChecked && (
                                            <div className="mt-3 p-2 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2">
                                                <Info className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                                                <p className="text-[9px] font-medium text-amber-700 leading-tight">
                                                    <span className="font-black uppercase tracking-widest block mb-0.5">Evidencia requerida</span>
                                                    {step.evidenceHint}
                                                </p>
                                            </div>
                                        )}

                                        {isChecked && execution?.checkedBy && (
                                            <p className="text-[8px] font-bold text-emerald-600 mt-2 uppercase tracking-widest flex items-center gap-1">
                                                <CheckCircle2 className="w-2.5 h-2.5" />
                                                Completado por {execution.checkedBy.split('@')[0]} el {new Date(execution.checkedAt || "").toLocaleDateString()}
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

            <div className="pt-6 border-t border-border flex justify-between items-center">
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={async () => {
                        if (confirm("¿Estás seguro de reiniciar todo el progreso de este playbook?")) {
                            await resetCockpitPlaybookAction(alert.fingerprint);
                            toast.success("Progreso reiniciado");
                        }
                    }}
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-[9px] font-black uppercase tracking-widest"
                >
                    Reiniciar Progreso
                </Button>
                <Button variant="outline" onClick={onClose} className="rounded-2xl text-[10px] font-black uppercase h-10 px-8">
                    Cerrar Panel
                </Button>
            </div>
        </div>
    );
}

/**
 * Performance Metrics Chart
 */
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
