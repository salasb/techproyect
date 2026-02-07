'use client'

import { useState, useEffect } from "react";
import { Database } from "@/types/supabase";
import { FinancialResult } from "@/services/financialCalculator";
import { getDollarRateAction } from "@/app/actions/currency";
import {
    Calendar,
    Clock,
    DollarSign,
    FileText,
    History,
    LayoutDashboard,
    PieChart,
    Settings,
    MoreVertical,
    CheckCircle2,
    AlertCircle,
    ArrowUpRight,
    TrendingUp,
    Info,
    Activity,
    Check,
    User,
    Wallet,
    X,
    Sparkles,
    RefreshCw
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, differenceInDays, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectSettings } from "./ProjectSettings";
import { AuditLog } from "./AuditLog";
import { ProjectLogsManager } from "./ProjectLogsManager";
import { QuoteItemsManager } from "./QuoteItemsManager";
import { CostsManager } from "./CostsManager";
import { InvoicesManager } from "./InvoicesManager";
import { ProjectScope } from "./ProjectScope";

interface ProjectDetailViewProps {
    project: any; // Using any for now to avoid strict type checks on complex joined data
    clients: any[];
    auditLogs: any[];
    financials: FinancialResult;
    settings: any;
    projectLogs: any[];
    risk: any;
}

export default function ProjectDetailView({ project, clients, auditLogs, financials, settings, projectLogs, risk }: ProjectDetailViewProps) {
    const [currency, setCurrency] = useState<'CLP' | 'USD'>('CLP');
    const [activeTab, setActiveTab] = useState('overview');
    const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
    const [isCostsModalOpen, setIsCostsModalOpen] = useState(false);
    const [exchangeRate, setExchangeRate] = useState<{ value: number, date: string } | null>(null);

    // Alerts logic

    // Alerts logic
    const alerts: { type: 'success' | 'warning' | 'danger', msg: string }[] = [];

    // Financial Alerts
    const marginPct = financials.priceNet > 0 ? (financials.marginAmountNet / financials.priceNet) : 0;
    if (marginPct < 0.1) alerts.push({ type: 'danger', msg: 'Margen crítico (< 10%)' });
    else if (marginPct < 0.3) alerts.push({ type: 'warning', msg: 'Margen bajo (< 30%)' });

    // Date Alerts
    if (project.plannedEndDate && new Date(project.plannedEndDate) < new Date() && project.status === 'EN_CURSO') {
        alerts.push({ type: 'danger', msg: 'Proyecto atrasado en fecha de término' });
    }

    useEffect(() => {
        const fetchRate = async () => {
            const rate = await getDollarRateAction();
            if (rate) setExchangeRate(rate);
        };
        fetchRate();
    }, []);

    const formatMoney = (amount: number) => {
        if (currency === 'CLP') {
            return `$${Math.round(amount).toLocaleString('es-CL')}`;
        } else {
            const rate = exchangeRate?.value || 1;
            return `US$${(amount / rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    };

    // Last Activity Logic
    const lastActivity = auditLogs && auditLogs.length > 0 ? auditLogs[0] : null;

    // Next Action Status Logic
    const getNextActionStatus = () => {
        if (!project.nextActionDate) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const actionDate = new Date(project.nextActionDate);
        actionDate.setHours(0, 0, 0, 0);

        const diff = differenceInDays(actionDate, today);

        if (diff < 0) return { label: 'Atrasado', color: 'text-red-600 bg-red-50 border-red-200', iconColor: 'text-red-500' };
        if (diff === 0) return { label: 'Para Hoy', color: 'text-amber-600 bg-amber-50 border-amber-200', iconColor: 'text-amber-500' };
        return { label: 'Pendiente', color: 'text-blue-600 bg-blue-50 border-blue-200', iconColor: 'text-blue-500' };
    };

    const actionStatus = getNextActionStatus();

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {/* Header / Navigation Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-2 rounded-xl shadow-sm sticky top-4 z-30 backdrop-blur-md bg-opacity-90">
                <div className="flex p-1 bg-muted/50 rounded-lg w-full sm:w-auto">
                    {[
                        { id: 'overview', label: 'Visión General', icon: LayoutDashboard },
                        { id: 'items', label: 'Ítems', icon: FileText },
                        { id: 'financials', label: 'Finanzas', icon: DollarSign },
                        { id: 'logs', label: 'Bitácora', icon: History },
                        { id: 'settings', label: 'Configuración', icon: Settings },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex-1 sm:flex-none justify-center
                                ${activeTab === tab.id
                                    ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm ring-1 ring-border'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                        >
                            <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-primary' : ''}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto p-1 bg-muted/50 rounded-lg">
                    <button
                        onClick={() => setCurrency('CLP')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex-1 text-center ${currency === 'CLP' ? 'bg-white dark:bg-zinc-800 shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        CLP
                    </button>
                    <button
                        onClick={() => setCurrency('USD')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex-1 text-center ${currency === 'USD' ? 'bg-white dark:bg-zinc-800 shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        USD
                    </button>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                    {/* Left Column: Status & Key Info */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* ALERTS & PENDING ACTIONS CARD */}
                        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center">
                                <Activity className="w-4 h-4 mr-2 text-primary" />
                                Estado y Alertas
                            </h3>

                            {/* Alert Logic Display */}
                            {alerts.length > 0 ? (
                                <div className="space-y-2 mb-4">
                                    {alerts.map((alert, idx) => (
                                        <div key={idx} className={`p-3 rounded-lg border text-sm flex items-center ${alert.type === 'danger' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/10' :
                                            alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/10' :
                                                'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/10'
                                            }`}>
                                            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                                            {alert.msg}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={`p-4 border rounded-lg text-sm mb-4 ${project.status === 'EN_ESPERA' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/10 dark:border-green-900/30'}`}>
                                    <div className="flex items-center font-medium mb-1">
                                        <Check className="w-4 h-4 mr-2" />
                                        {project.status === 'EN_ESPERA' ? 'Sin Alertas (En Espera)' : 'Todo en orden'}
                                    </div>
                                    <p className="text-xs opacity-90 leading-relaxed">
                                        {project.status === 'EN_ESPERA'
                                            ? 'El proyecto está detenido. No se esperan avances ni movimientos financieros.'
                                            : 'El proyecto avanza según lo planificado.'}
                                        {project.status === 'EN_CURSO' && (
                                            <ul className="list-disc list-inside mt-1 space-y-0.5 ml-1">
                                                <li>Presupuesto ejecutado al <strong>{financials.calculatedProgress.toFixed(0)}%</strong> (Dentro de lo esperado).</li>
                                                <li>Margen actual del <strong>{(financials.priceNet > 0 ? (financials.marginAmountNet / financials.priceNet) * 100 : 0).toFixed(1)}%</strong> considerado saludable.</li>
                                                {project.nextActionDate && <li>Próxima acción programada para el <strong>{format(new Date(project.nextActionDate), 'dd MMM', { locale: es })}</strong>.</li>}
                                            </ul>
                                        )}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* NEXT ACTION - IMPROVED */}
                                <div className={`p-3 rounded-lg border ${actionStatus ? actionStatus.color.replace('text-', 'border-').replace('bg-', 'bg-opacity-10 ') : 'bg-zinc-50 border-zinc-100'} relative overflow-hidden`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Siguiente Gestión</span>
                                        {actionStatus && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${actionStatus.color}`}>
                                                {actionStatus.label}
                                            </span>
                                        )}
                                    </div>

                                    <div className="font-medium text-sm flex items-start mt-2">
                                        <Calendar className={`w-4 h-4 mr-2 mt-0.5 shrink-0 ${actionStatus ? actionStatus.iconColor : 'text-zinc-400'}`} />
                                        <span className="line-clamp-2">{project.nextAction || "Sin gestión pendiente"}</span>
                                    </div>

                                    <div className="text-xs text-zinc-500 mt-2 pl-6">
                                        {project.nextActionDate ? (
                                            <span>
                                                {format(new Date(project.nextActionDate), "d 'de' MMMM", { locale: es })}
                                                {actionStatus?.label === 'Atrasado' && <span className="text-red-600 font-medium ml-1">(Vencido)</span>}
                                            </span>
                                        ) : '-'}
                                    </div>
                                </div>

                                {/* RESPONSIBLE & LAST ACTIVITY - IMPROVED */}
                                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between">
                                    <div>
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-2">Responsable</span>
                                        <div className="font-medium text-sm flex items-center mb-3">
                                            <User className="w-4 h-4 mr-2 text-primary/70" />
                                            {project.responsible || "Sin asignar"}
                                        </div>
                                    </div>

                                    {lastActivity && (
                                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 mt-auto">
                                            <div className="flex items-center text-xs text-muted-foreground mb-0.5">
                                                <History className="w-3 h-3 mr-1" />
                                                última actividad:
                                            </div>
                                            <div className="text-xs font-medium text-foreground truncate" title={`${lastActivity.userName || 'Usuario'} - ${lastActivity.details || ''}`}>
                                                {lastActivity.userName || 'Usuario'}
                                            </div>
                                            <div className="text-[10px] text-zinc-500">
                                                hace {formatDistanceToNow(new Date(lastActivity.createdAt!), { locale: es })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RECENT ACTIVITY / MILESTONES */}
                        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-semibold text-foreground flex items-center">
                                    <History className="w-4 h-4 mr-2 text-primary" />
                                    Hitos Recientes
                                </h3>
                                <button
                                    onClick={() => setActiveTab('logs')}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    Ver Bitácora Completa
                                </button>
                            </div>
                            {projectLogs && projectLogs.length > 0 ? (
                                <div className="space-y-3">
                                    {projectLogs.slice(0, 3).map((log: any) => (
                                        <div key={log.id} className="flex gap-3 text-sm p-2 hover:bg-muted/50 rounded-lg transition-colors">
                                            <div className="flex-none w-16 text-xs text-muted-foreground pt-0.5">
                                                {format(new Date(log.createdAt), 'dd MMM')}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium
                                                            ${log.type === 'MILESTONE' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300' :
                                                            log.type === 'BLOCKER' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300' :
                                                                'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300'}`}>
                                                        {log.type === 'MILESTONE' ? 'HITO' : log.type === 'BLOCKER' ? 'BLOQUEO' : 'NOTA'}
                                                    </span>
                                                    <span className="font-medium text-foreground line-clamp-1">{log.content}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-xs text-muted-foreground italic">
                                    No hay registros en la bitácora aún.
                                </div>
                            )}
                        </div>

                        {/* DEADLINES & STATUS CARD (Simplified) */}
                        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-semibold text-foreground flex items-center">
                                    <Calendar className="w-4 h-4 mr-2 text-primary" />
                                    Plazos del Proyecto
                                </h3>
                                {/* Optional: Add a simple status badge here if needed, or keep clean */}
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-center divide-x divide-border">
                                <div>
                                    <div className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">Inicio</div>
                                    <div className="font-medium text-sm text-foreground">
                                        {project.startDate ? format(new Date(project.startDate), 'dd MMM yy') : '-'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">Término</div>
                                    <div className="font-medium text-sm text-foreground">
                                        {project.plannedEndDate ? format(new Date(project.plannedEndDate), 'dd MMM yy') : '-'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">Tiempo Restante</div>
                                    <div className={`font-bold text-sm ${financials.trafficLightTime === 'RED' ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                                        {project.plannedEndDate ? (
                                            (() => {
                                                const days = differenceInDays(new Date(project.plannedEndDate), new Date());
                                                if (days < 0) return `Vencido hace ${Math.abs(days)} días`;
                                                if (days === 0) return 'Vence hoy';
                                                return `${days} días`;
                                            })()
                                        ) : '-'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <ProjectScope project={project} />
                    </div>

                    {/* Right Column: Financial Summary */}
                    <div className="space-y-6">
                        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-border bg-muted/20">
                                <h3 className="font-semibold text-foreground flex items-center">
                                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                                    Finanzas
                                    <div className="ml-auto flex items-center gap-2">
                                        {currency === 'USD' && exchangeRate && (
                                            <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100 flex items-center" title={`Dólar Observado al ${new Date(exchangeRate.date).toLocaleDateString()}`}>
                                                <RefreshCw className="w-3 h-3 mr-1" />
                                                Hoy: ${exchangeRate.value.toLocaleString('es-CL', { maximumFractionDigits: 1 })}
                                            </span>
                                        )}
                                    </div>
                                </h3>
                            </div>
                            <div className="p-6 space-y-8">
                                {/* Cost Analysis */}
                                {/* Financial Plan vs Actual */}
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6 border-b border-border pb-2">Plan vs Ejecución</h4>
                                    <div className="flex flex-col gap-8">
                                        {/* Plan (Business Case) */}
                                        <div className="relative pl-4 border-l-2 border-zinc-200 dark:border-zinc-700">
                                            <h5 className="text-sm font-bold text-foreground mb-3 flex items-center justify-between">
                                                <span>Planificado (Base)</span>
                                                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-medium">Presupuesto</span>
                                            </h5>

                                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                                <div className="text-muted-foreground">Venta Neta</div>
                                                <div className="text-right font-medium">{formatMoney(financials.priceNet)}</div>

                                                <div className="text-muted-foreground">Costo Base</div>
                                                <div className="text-right text-zinc-500">-{formatMoney(financials.baseCostNet)}</div>

                                                <div className="col-span-2 my-1 border-t border-border"></div>

                                                <div className="font-medium text-foreground">Utilidad Proy.</div>
                                                <div className="text-right font-bold text-green-600 dark:text-green-500">
                                                    {formatMoney(financials.marginAmountNet)}
                                                </div>

                                                <div className="text-xs text-muted-foreground">Margen %</div>
                                                <div className="text-right text-xs font-medium text-green-600 dark:text-green-500">
                                                    {financials.priceNet > 0 ? ((financials.marginAmountNet / financials.priceNet) * 100).toFixed(1) : '0.0'}%
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actual (Reality) */}
                                        <div className="relative pl-4 border-l-2 border-amber-400 dark:border-amber-600/50">
                                            <h5 className="text-sm font-bold text-foreground mb-3 flex items-center justify-between">
                                                <span>Gastos Ejecutados</span>
                                            </h5>

                                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                                <div className="text-muted-foreground">Total Gastos</div>
                                                <div className="text-right font-medium text-amber-700 dark:text-amber-500">
                                                    -{formatMoney(financials.totalExecutedCostNet)}
                                                </div>

                                                <div className="col-span-2 my-1 border-t border-border border-dashed"></div>

                                                <div className="font-medium text-foreground">Saldo (Venta - Gasto)</div>
                                                <div className="text-right">
                                                    {(() => {
                                                        const balance = financials.priceNet - financials.totalExecutedCostNet;
                                                        return (
                                                            <span className={`font-bold ${balance < 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                                                                {formatMoney(balance)}
                                                            </span>
                                                        )
                                                    })()}
                                                </div>

                                                <div className="col-span-2 mt-1">
                                                    <p className="text-[10px] text-muted-foreground italic leading-tight">
                                                        * Saldo disponible para cubrir gastos restantes y utilidad.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Grand Total */}
                                <div className="mt-6 pt-4 border-t border-border">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                                            <span>Neto</span>
                                            <span className="font-mono">{formatMoney(financials.priceNet)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                                            <span>IVA</span>
                                            <span className="font-mono">{formatMoney(financials.vatAmount)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-dashed border-border mt-1">
                                            <span className="font-bold text-foreground text-base">Total a Facturar</span>
                                            <span className="text-xl font-bold text-primary font-mono">{formatMoney(financials.priceGross)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <ProjectLogsManager projectId={project.id} logs={projectLogs} />
            )}

            {activeTab === 'items' && (
                <QuoteItemsManager
                    projectId={project.id}
                    items={project.quoteItems || []}
                    defaultMargin={project.marginPct ? project.marginPct * 100 : 30}
                    currency={currency}
                />
            )}

            {activeTab === 'financials' && (
                <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
                    {/* Left Column: Management */}
                    <div className="lg:col-span-2 space-y-8">
                        <section>
                            <CostsManager projectId={project.id} costs={project.costEntries} currency={currency} />
                        </section>
                        <section>
                            <InvoicesManager projectId={project.id} invoices={project.invoices} currency={currency} />
                        </section>
                    </div>

                    {/* Right Column: Financial Summary Widget */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* 1. ANALYSIS WIDGET (PROACTIVE) */}
                        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-border bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/20 dark:to-zinc-950">
                                <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 flex items-center">
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Análisis de Viabilidad
                                </h3>
                            </div>
                            <div className="p-5">
                                {(() => {
                                    const marginPct = financials.priceNet > 0 ? (financials.marginAmountNet / financials.priceNet) * 100 : 0;
                                    const isProfitable = marginPct > 10;
                                    const isHighProfit = marginPct > 30;
                                    const hasBalance = (financials.priceNet - financials.totalExecutedCostNet) > 0;

                                    let verdict = "El proyecto presenta indicadores positivos.";
                                    let statusColor = "text-green-600";

                                    if (isHighProfit) {
                                        verdict = "Este proyecto es altamente rentable con un margen superior al 30%.";
                                    } else if (isProfitable) {
                                        verdict = "El proyecto es rentable y se mantiene dentro de los márgenes esperados.";
                                    } else {
                                        verdict = "La rentabilidad es baja. Se recomienda revisar la estructura de costos.";
                                        statusColor = "text-amber-600";
                                    }

                                    if (!hasBalance) {
                                        verdict = "ALERTA: El proyecto presenta déficit (gastos superan venta).";
                                        statusColor = "text-red-600";
                                    }

                                    return (
                                        <div className="space-y-4">
                                            <div className={`text-sm font-medium ${statusColor}`}>
                                                {verdict}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded border border-zinc-100 dark:border-zinc-800">
                                                    <span className="text-[10px] uppercase text-muted-foreground block">Rentabilidad</span>
                                                    <span className={`text-sm font-bold ${marginPct < 10 ? 'text-amber-600' : 'text-green-600'}`}>
                                                        {marginPct < 10 ? 'BAJA' : marginPct > 30 ? 'ALTA' : 'NORMAL'} ({marginPct.toFixed(1)}%)
                                                    </span>
                                                </div>
                                                <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded border border-zinc-100 dark:border-zinc-800">
                                                    <span className="text-[10px] uppercase text-muted-foreground block">Flujo de Caja</span>
                                                    <span className={`text-sm font-bold ${hasBalance ? 'text-blue-600' : 'text-red-600'}`}>
                                                        {hasBalance ? 'POSITIVO' : 'DÉFICIT'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="bg-card rounded-xl border border-border sticky top-6 overflow-hidden">
                            {/* Header */}
                            <div className="p-6 border-b border-border bg-muted/30">
                                <h3 className="text-base font-semibold text-foreground flex items-center flex-wrap gap-2">
                                    <Wallet className="w-5 h-5 mr-2 text-primary" />
                                    Desglose Financiero
                                    <div className="ml-auto flex items-center gap-2">
                                        {currency === 'USD' && (
                                            <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100 flex items-center" title="Tipo de cambio del día">
                                                <RefreshCw className="w-3 h-3 mr-1" />
                                                {exchangeRate ? `Hoy: $${exchangeRate.value.toLocaleString('es-CL', { maximumFractionDigits: 0 })} CLP` : 'Cargando tasa...'}
                                            </span>
                                        )}
                                        <span className="text-xs font-mono bg-background px-2 py-1 rounded border border-border text-muted-foreground">
                                            {currency}
                                        </span>
                                    </div>
                                </h3>
                            </div>

                            <div className="p-6 space-y-8">
                                {/* Cost Analysis */}
                                {/* Financial Breakdown Table */}
                                <div className="space-y-4">

                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-2">Estado de Resultados</h4>

                                    <div className="space-y-2 text-sm">
                                        {/* Real P&L */}
                                        <div className="grid grid-cols-2 py-1">
                                            <span className="text-muted-foreground">Venta Neta</span>
                                            <div className="text-right font-mono text-zinc-700 dark:text-zinc-300">
                                                {formatMoney(financials.priceNet)}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 py-1">
                                            <span className="text-muted-foreground">Gastos Ejecutados</span>
                                            <div className={`text-right font-mono font-medium ${financials.totalExecutedCostNet > financials.priceNet ? 'text-red-600 font-bold' : 'text-amber-600 dark:text-amber-500'}`}>
                                                -{formatMoney(financials.totalExecutedCostNet)}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 py-1 border-t border-dashed border-border">
                                            <div className="flex items-center gap-1.5 pt-1">
                                                <span className="text-muted-foreground font-medium text-foreground">Saldo Disponible</span>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right">
                                                            <p className="font-semibold">Venta Total - Gastos</p>
                                                            <p className="text-xs">No es utilidad final hasta cerrar el proyecto.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                            <div className="text-right pt-1">
                                                {(() => {
                                                    const balance = financials.priceNet - financials.totalExecutedCostNet;
                                                    return (
                                                        <span className={`font-mono font-bold block ${balance < 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                                                            {formatMoney(balance)}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Projected Reference */}
                                        {/* Projected Reference (Highlighted) */}
                                        <div className="grid grid-cols-2 py-2 px-3 mt-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50 rounded-lg">
                                            <div className="flex flex-col justify-center">
                                                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-tight">Utilidad Proyectada</span>
                                                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-500 mt-0.5">
                                                    Margen Objetivo: {financials.priceNet > 0 ? ((financials.marginAmountNet / financials.priceNet) * 100).toFixed(1) : '0.0'}%
                                                </span>
                                            </div>
                                            <div className="text-right flex items-center justify-end">
                                                <span className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400 block">
                                                    {formatMoney(financials.marginAmountNet)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6 border-b border-border pb-2">Resumen Venta</h4>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Neto</span>
                                            <span className="font-mono font-medium">{formatMoney(financials.priceNet)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">IVA ({(settings?.vatRate || 0.19) * 100}%)</span>
                                            <span className="font-mono font-medium text-muted-foreground">+{formatMoney(financials.vatAmount)}</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-border mt-2">
                                            <span className="font-bold text-foreground">Total Bruto</span>
                                            <span className="font-mono font-bold text-lg text-primary">{formatMoney(financials.priceGross)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Collections Status */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cobranza</h4>
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {((financials.totalInvoicedGross / financials.priceGross) * 100).toFixed(0)}% Facturado
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-primary h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                                style={{ width: `${Math.min((financials.totalInvoicedGross / financials.priceGross) * 100, 100)}%` }}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 bg-card border border-border rounded-lg shadow-sm">
                                                <span className="block text-[10px] uppercase text-muted-foreground mb-1 font-semibold">Facturado</span>
                                                <span className="font-mono text-lg font-semibold text-foreground block">
                                                    {formatMoney(financials.totalInvoicedGross)}
                                                </span>
                                            </div>
                                            <div className="p-3 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-lg shadow-sm">
                                                <span className="block text-[10px] uppercase text-orange-600 dark:text-orange-400 mb-1 font-semibold">Por Facturar</span>
                                                <span className="font-mono text-lg font-semibold text-orange-700 dark:text-orange-300 block">
                                                    {formatMoney(financials.pendingToInvoiceGross)}
                                                </span>
                                            </div>
                                        </div>

                                        {financials.receivableGross > 0 && (
                                            <div className="p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg flex justify-between items-center animate-pulse">
                                                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase flex items-center">
                                                    <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                                                    Pendiente de Pago
                                                </span>
                                                <span className="font-mono font-bold text-red-700 dark:text-red-300">
                                                    {formatMoney(financials.receivableGross)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="space-y-8">
                    <ProjectSettings key={project.clientId ? `${project.clientId}-${project.updatedAt}` : `no-client-${project.updatedAt}`} project={project} clients={clients} />

                    <div>
                        <h3 className="text-lg font-medium text-foreground mb-4">Registro de Actividad</h3>
                        <div className="bg-card rounded-xl border border-border p-6">
                            <AuditLog logs={auditLogs} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ title, value, icon: Icon, trend, trendColor = "text-muted-foreground" }: any) {
    return (
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="w-5 h-5 text-primary" />
                </div>
            </div>
            <div className="mt-4">
                <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                {trend && <p className={`text-xs mt-1 ${trendColor} font-medium`}>{trend}</p>}
            </div>
        </div>
    )
}
