"use client";

import React from "react";
import { AlertCircle, ShieldAlert, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { acknowledgeAlert } from "@/app/actions/superadmin-v2";
import type { AlertItem } from "@/lib/superadmin/cockpit-data-adapter";

export function SuperadminAlertsList({ alerts }: { alerts: AlertItem[] }) {
    if (alerts.length === 0) return null;

    const handleAck = async (id: string) => {
        try {
            await acknowledgeAlert(id);
        } catch (error) {
            console.error("Failed to acknowledge alert", error);
        }
    };

    const getColors = (severity: string) => {
        if (severity === 'CRITICAL') return 'border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-400';
        if (severity === 'WARNING') return 'border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400';
        return 'border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-400';
    };

    const getIcon = (severity: string) => {
        if (severity === 'CRITICAL') return <ShieldAlert className="w-5 h-5" />;
        if (severity === 'WARNING') return <AlertTriangle className="w-5 h-5" />;
        return <Info className="w-5 h-5" />;
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-2">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                Alertas Activas del Ecosistema ({alerts.length})
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {alerts.map((alert, idx) => {
                    if (!alert) return null;
                    return (
                        <Card key={alert.id || `alert-${idx}`} className={`rounded-3xl border ${getColors(alert.severity || 'INFO')} shadow-sm hover:shadow-md transition-all overflow-hidden`}>
                            <CardContent className="p-5 flex gap-5">
                                <div className="shrink-0 mt-1">
                                    {getIcon(alert.severity || 'INFO')}
                                </div>
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-[13px] font-black uppercase tracking-tight truncate">{alert.title || 'Alerta Sin Título'}</p>
                                        <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                                            {alert.organization?.name || 'Sistema'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed opacity-80 font-medium">{alert.description || 'Sin descripción detallada.'}</p>
                                    <div className="flex items-center justify-between pt-2 border-t border-current/10 mt-3">
                                        <span className="text-[9px] font-bold uppercase opacity-50">
                                            Detectada {alert.detectedAt ? new Date(alert.detectedAt).toLocaleDateString() : 'n/a'}
                                        </span>
                                        {alert.status === 'ACTIVE' && alert.id && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-3 text-[10px] font-black uppercase tracking-tight hover:bg-current/10 transition-colors"
                                                onClick={() => handleAck(alert.id)}
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                Reconocer
                                            </Button>
                                        )}
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
