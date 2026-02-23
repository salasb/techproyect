"use client";

import React, { useState } from "react";
import { ShieldAlert, AlertTriangle, Info, CheckCircle2, ExternalLink, MoreVertical, Clock, CheckCheck, BellRing, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { acknowledgeCockpitAlert, snoozeCockpitAlert, resolveCockpitAlert } from "@/app/actions/superadmin-v2";
import type { CockpitOperationalAlert, OperationalActionResult } from "@/lib/superadmin/cockpit-data-adapter";
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
import { toast } from "sonner";

export function SuperadminAlertsList({ alerts }: { alerts: CockpitOperationalAlert[] }) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

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

    const getColors = (severity: string) => {
        if (severity === 'CRITICAL' || severity === 'critical') return 'border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-400';
        if (severity === 'WARNING' || severity === 'warning') return 'border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400';
        return 'border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-400';
    };

    const getIcon = (severity: string) => {
        if (severity === 'CRITICAL' || severity === 'critical') return <ShieldAlert className="w-5 h-5" />;
        if (severity === 'WARNING' || severity === 'warning') return <AlertTriangle className="w-5 h-5" />;
        return <Info className="w-5 h-5" />;
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

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                    <BellRing className="w-3.5 h-3.5 text-rose-500" />
                    Monitor de Incidentes ({alerts.length})
                </h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {alerts.map((alert, idx) => {
                    if (!alert) return null;
                    const isSnoozed = alert.state === 'snoozed';
                    const isLoading = loadingId === alert.id;

                    return (
                        <Card key={alert.id || `alert-${idx}`} className={cn(
                            "rounded-[2rem] border transition-all overflow-hidden relative group",
                            getColors(alert.severity || 'info'),
                            isSnoozed && "opacity-60 grayscale-[0.5]"
                        )}>
                            <CardContent className="p-6 flex gap-5">
                                <div className="shrink-0 mt-1">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin opacity-50" /> : getIcon(alert.severity || 'info')}
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[13px] font-black uppercase tracking-tight truncate">{alert.title || 'Alerta Sin Título'}</p>
                                                <StatusBadge state={alert.state} snoozedUntil={alert.snoozedUntil} />
                                            </div>
                                            <span className="text-[8px] font-mono uppercase opacity-50 tracking-tighter mt-0.5">{alert.ruleCode}</span>
                                        </div>
                                        <span className="text-[9px] font-black bg-white/20 dark:bg-black/20 px-2 py-1 rounded-lg truncate max-w-[120px] shadow-inner uppercase tracking-widest">
                                            {alert.organization?.name || 'Sistema'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed opacity-80 font-medium italic">{alert.description || 'Sin descripción detallada.'}</p>
                                    
                                    <div className="flex items-center justify-between pt-3 border-t border-current/10 mt-2">
                                        <div className="flex items-center gap-4">
                                            <span className="text-[8px] font-bold uppercase opacity-50">
                                                Detectada {alert.detectedAt ? new Date(alert.detectedAt).toLocaleDateString() : 'n/a'}
                                            </span>
                                            {alert.href && (
                                                <Link href={alert.href}>
                                                    <span className="text-[9px] font-black text-blue-600 hover:underline flex items-center gap-1 cursor-pointer group-hover:translate-x-0.5 transition-transform">
                                                        <ExternalLink className="w-2.5 h-2.5" />
                                                        Contexto
                                                    </span>
                                                </Link>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger disabled={isLoading} asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-current/10 transition-colors">
                                                        <MoreVertical className="w-3.5 h-3.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl border-border shadow-2xl">
                                                    {alert.state === 'open' && (
                                                        <DropdownMenuItem 
                                                            onClick={() => handleAction(alert.id, () => acknowledgeCockpitAlert(alert.fingerprint))}
                                                            className="rounded-xl cursor-pointer flex items-center gap-2 p-2.5"
                                                        >
                                                            <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                                                            <span className="text-xs font-black uppercase">Acusar Recibo</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    
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

function TrendingUp({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
    );
}
