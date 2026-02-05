'use client'

import { useState } from "react";
import { Database } from "@/types/supabase";
import { FinancialResult } from "@/services/financialCalculator";
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
    X
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, differenceInDays } from "date-fns";
import { QuoteItemsManager } from "./QuoteItemsManager";
import { CostsManager } from "./CostsManager";
import { InvoicesManager } from "./InvoicesManager";
import { ProjectSettings } from "./ProjectSettings";
import { ProjectHeader } from "./ProjectHeader";
import { AuditLog } from "./AuditLog";
import { ProjectScope } from "./ProjectScope";
import { ProjectLogsManager } from "./ProjectLogsManager";

type Project = Database['public']['Tables']['Project']['Row']
type Company = Database['public']['Tables']['Company']['Row']
type CostEntry = Database['public']['Tables']['CostEntry']['Row']
type Invoice = Database['public']['Tables']['Invoice']['Row']
type QuoteItem = Database['public']['Tables']['QuoteItem']['Row']
type AuditLogEntry = Database['public']['Tables']['AuditLog']['Row']
type Settings = Database['public']['Tables']['Settings']['Row']

type ProjectLog = Database['public']['Tables']['ProjectLog']['Row']

type Props = {
    project: Project & { company: Company; client?: Database['public']['Tables']['Client']['Row'] | null; costEntries: CostEntry[]; invoices: Invoice[]; quoteItems: QuoteItem[] };
    financials: FinancialResult;
    settings?: Settings;
    auditLogs: AuditLogEntry[];
    projectLogs: ProjectLog[];
    clients: Database['public']['Tables']['Client']['Row'][];
}

export function ProjectDetailView({ project, financials, settings, auditLogs, projectLogs, clients }: Props) {
    const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'financials' | 'settings' | 'logs'>('overview');

    // State for modal
    const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
    const [isCostsModalOpen, setIsCostsModalOpen] = useState(false);

    // Calculate Alerts
    const alerts = [];
    if (project.status === 'EN_CURSO' && project.progress < 100) {
        if (financials.trafficLightTime === 'RED') alerts.push({ type: 'danger', msg: 'Proyecto atrasado' });
        if (financials.trafficLightTime === 'YELLOW') alerts.push({ type: 'warning', msg: 'Fecha de término cercana' });
    }
    if (!project.quoteItems || project.quoteItems.length === 0) {
        alerts.push({ type: 'info', msg: 'Sin ítems de cotización' });
    }

    return (
        <div className="space-y-6">
            <ProjectHeader project={project} />

            {/* Tabs */}
            <div className="border-b border-zinc-200 dark:border-zinc-800">
                <nav className="flex space-x-8" aria-label="Tabs">
                    {[
                        { id: 'overview', label: 'Resumen' },
                        { id: 'logs', label: 'Bitácora' },
                        { id: 'items', label: 'Ítems / Detalle' },
                        { id: 'financials', label: 'Finanzas' },
                        { id: 'settings', label: 'Configuración' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300'}
              `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="space-y-6 animate-in fade-in duration-300">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: Project Status & Details */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* ALERTS & PENDING ACTIONS CARD */}
                            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center">
                                    <Activity className="w-4 h-4 mr-2 text-primary" />
                                    Estado y Alertas
                                </h3>

                                {alerts.length > 0 ? (
                                    <div className="space-y-2 mb-4">
                                        {alerts.map((alert, idx) => (
                                            <div key={idx} className={`p-3 rounded-lg border text-sm flex items-center ${alert.type === 'danger' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/10' :
                                                alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/10' :
                                                    'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/10'
                                                }`}>
                                                <AlertCircle className="w-4 h-4 mr-2" />
                                                {alert.msg}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm mb-4 flex items-center dark:bg-green-900/10 cursor-help">
                                                    <Check className="w-4 h-4 mr-2" />
                                                    Todo en orden.
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <ul className="list-disc pl-4 text-xs space-y-1">
                                                    <li>Cronograma: A tiempo (Avance vs Tiempo)</li>
                                                    <li>Presupuesto: Definido (Ítems cargados)</li>
                                                </ul>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                        <span className="text-xs text-muted-foreground block mb-1">Próxima Acción</span>
                                        <div className="font-medium text-sm flex items-center">
                                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
                                            {project.nextAction || "Sin definir"}
                                        </div>
                                        <div className="text-xs text-zinc-500 mt-1 pl-5">
                                            {project.nextActionDate ? format(new Date(project.nextActionDate), 'dd MMM yyyy') : '-'}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                        <span className="text-xs text-muted-foreground block mb-1">Responsable</span>
                                        <div className="font-medium text-sm flex items-center">
                                            <User className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
                                            {project.responsible || "Sin asignar"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* PROGRESS CARD */}
                            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-sm font-semibold text-foreground flex items-center">
                                        <Activity className="w-4 h-4 mr-2 text-primary" />
                                        Progreso del Proyecto
                                    </h3>
                                    <div className="flex items-baseline space-x-1">
                                        <span className="text-3xl font-bold text-primary">{project.progress}%</span>
                                        <span className="text-xs text-muted-foreground uppercase font-medium">Completado</span>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Work Progress (Manual) */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium">Avance Reportado</span>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="cursor-help bg-zinc-100 dark:bg-zinc-800 text-[10px] px-1.5 py-0.5 rounded text-muted-foreground">Manual</div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Porcentaje de avance ingresado manualmente por el jefe de proyecto.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                            <span className="text-muted-foreground">{project.progress}%</span>
                                        </div>
                                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden shadow-inner">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000 ease-out shadow-lg"
                                                style={{ width: `${project.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Financial Progress (Calculated) */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium">Avance Financiero</span>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Costo Ejecutado ({financials.totalExecutedCostNet.toLocaleString()}) / Presupuesto Base ({financials.baseCostNet.toLocaleString()})</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                            <span className="text-muted-foreground">{financials.calculatedProgress.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${financials.calculatedProgress > 100 ? 'bg-red-500' : 'bg-green-500'}`}
                                                style={{ width: `${Math.min(financials.calculatedProgress, 100)}%` }}
                                            ></div>
                                        </div>
                                        {financials.calculatedProgress > 100 && (
                                            <p className="text-[10px] text-red-500 mt-1 flex items-center">
                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                Sobrecosto detectado
                                            </p>
                                        )}
                                    </div>

                                    {/* Time Progress */}
                                    {(() => {
                                        if (!project.startDate || !project.plannedEndDate) return null;
                                        const start = new Date(project.startDate);
                                        const end = new Date(project.plannedEndDate);
                                        const today = new Date();
                                        const totalDays = differenceInDays(end, start);
                                        const daysPassed = differenceInDays(today, start);
                                        let timeProgress = 0;
                                        if (totalDays > 0) {
                                            timeProgress = Math.max(0, Math.min(100, (daysPassed / totalDays) * 100));
                                        }

                                        return (
                                            <div>
                                                <div className="flex justify-between text-xs mb-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium text-zinc-500">Tiempo Transcurrido</span>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-help" />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Tiempo transcurrido desde la fecha de inicio hasta hoy.</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                    <span className="text-zinc-500">{timeProgress.toFixed(0)}%</span>
                                                </div>
                                                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${timeProgress > project.progress ? 'bg-red-400' : 'bg-zinc-400'}`}
                                                        style={{ width: `${timeProgress}%` }}
                                                    ></div>
                                                </div>
                                                {timeProgress > project.progress && (
                                                    <p className="text-[10px] text-red-500 mt-1 flex items-center">
                                                        <AlertCircle className="w-3 h-3 mr-1" />
                                                        El tiempo avanza más rápido que el proyecto.
                                                    </p>
                                                )}
                                            </div>
                                        )
                                    })()}
                                </div>

                                <div className="mt-6 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center divide-x divide-border">
                                    <div>
                                        <div className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">Inicio</div>
                                        <div className="font-medium text-sm">{format(new Date(project.startDate), 'dd MMM yy')}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">Término</div>
                                        <div className="font-medium text-sm">
                                            {project.plannedEndDate ? format(new Date(project.plannedEndDate), 'dd MMM yy') : '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">Restante</div>
                                        <div className={`font-bold text-sm ${financials.trafficLightTime === 'RED' ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                            {project.plannedEndDate ? `${differenceInDays(new Date(project.plannedEndDate), new Date())} días` : '-'}
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
                                    </h3>
                                </div>
                                <div className="p-6 space-y-8">
                                    {/* Cost Analysis */}
                                    {/* Financial Plan vs Actual */}
                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">Plan vs Ejecución</h4>
                                        <div className="grid grid-cols-2 gap-8">
                                            {/* Plan (Business Case) */}
                                            <div className="space-y-3">
                                                <h5 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center">
                                                    Planificado
                                                    <span className="ml-2 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full">Base</span>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Info className="w-4 h-4 ml-1 text-muted-foreground/70 cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent className="max-w-xs">
                                                                <p>Montos definidos en los Ítems de Cotización (Presupuesto inicial).</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </h5>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between text-muted-foreground">
                                                        <span>Costo Base</span>
                                                        <span>${financials.baseCostNet.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between text-muted-foreground">
                                                        <span>Utilidad Proy.</span>
                                                        <span>${financials.marginAmountNet.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between font-medium text-foreground pt-2 border-t border-border">
                                                        <span>Venta Neta</span>
                                                        <span>${financials.priceNet.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actual (Reality) */}
                                            <div className="space-y-3">
                                                <h5 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center">
                                                    Ejecución Real
                                                    <span className="ml-2 text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">Actual</span>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Info className="w-4 h-4 ml-1 text-muted-foreground/70 cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent className="max-w-xs">
                                                                <p>Montos calculados en base a los Gastos registrados.</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </h5>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between text-muted-foreground">
                                                        <span>Costo Real</span>
                                                        <span className="font-bold text-amber-600 dark:text-amber-500">${financials.totalExecutedCostNet.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between text-muted-foreground">
                                                        <span>Utilidad Real</span>
                                                        {(() => {
                                                            const realMargin = financials.priceNet - financials.totalExecutedCostNet;
                                                            return (
                                                                <span className={`font-bold ${realMargin < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                    ${realMargin.toLocaleString()}
                                                                </span>
                                                            )
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Grand Total */}
                                        <div className="mt-6 pt-4 border-t border-border">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between items-center text-sm text-muted-foreground">
                                                    <span>Neto</span>
                                                    <span className="font-mono">${financials.priceNet.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm text-muted-foreground">
                                                    <span>IVA</span>
                                                    <span className="font-mono">${financials.vatAmount.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-dashed border-border mt-1">
                                                    <span className="font-bold text-foreground text-base">Total a Facturar</span>
                                                    <span className="text-xl font-bold text-primary font-mono">${financials.priceGross.toLocaleString()}</span>
                                                </div>
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
                    <QuoteItemsManager projectId={project.id} items={project.quoteItems || []} />
                )}

                {activeTab === 'financials' && (
                    <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
                        {/* Left Column: Management */}
                        <div className="lg:col-span-2 space-y-8">
                            <section>
                                <CostsManager projectId={project.id} costs={project.costEntries} />
                            </section>
                            <section>
                                <InvoicesManager projectId={project.id} invoices={project.invoices} />
                            </section>
                        </div>

                        {/* Right Column: Financial Summary Widget */}
                        <div className="lg:col-span-1">
                            <div className="bg-card rounded-xl border border-border sticky top-6 overflow-hidden">
                                {/* Header */}
                                <div className="p-6 border-b border-border bg-muted/30">
                                    <h3 className="text-base font-semibold text-foreground flex items-center">
                                        <Wallet className="w-5 h-5 mr-2 text-primary" />
                                        Desglose Financiero
                                    </h3>
                                </div>

                                <div className="p-6 space-y-8">
                                    {/* Cost Analysis */}
                                    {/* Financial Breakdown Table */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-2">Rentabilidad</h4>

                                        <div className="space-y-2 text-sm">
                                            {/* Projected */}
                                            <div className="grid grid-cols-2 py-1">
                                                <span className="text-muted-foreground">Utilidad Proyectada</span>
                                                <div className="text-right">
                                                    <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300 block">
                                                        ${financials.marginAmountNet.toLocaleString()}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        ({financials.priceNet > 0 ? ((financials.marginAmountNet / financials.priceNet) * 100).toFixed(1) : 0}%)
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Real */}
                                            <div className="grid grid-cols-2 py-1 border-t border-dashed border-border">
                                                <span className="text-muted-foreground pt-1">Utilidad Real</span>
                                                <div className="text-right pt-1">
                                                    {(() => {
                                                        const realMargin = financials.priceNet - financials.totalExecutedCostNet;
                                                        const realMarginPct = financials.priceNet > 0 ? (realMargin / financials.priceNet) * 100 : 0;
                                                        const isNegative = realMargin < 0;
                                                        return (
                                                            <>
                                                                <span className={`font-mono font-bold block ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                                                                    ${realMargin.toLocaleString()}
                                                                </span>
                                                                <span className={`text-[10px] ${isNegative ? 'text-red-500' : 'text-green-600'}`}>
                                                                    ({realMarginPct.toFixed(1)}%)
                                                                </span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>

                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6 border-b border-border pb-2">Resumen Venta</h4>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Neto</span>
                                                <span className="font-mono font-medium">${financials.priceNet.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">IVA ({(settings?.vatRate || 0.19) * 100}%)</span>
                                                <span className="font-mono font-medium text-muted-foreground">+${financials.vatAmount.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t border-border mt-2">
                                                <span className="font-bold text-foreground">Total Bruto</span>
                                                <span className="font-mono font-bold text-lg text-primary">${financials.priceGross.toLocaleString()}</span>
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
                                                        ${financials.totalInvoicedGross.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-lg shadow-sm">
                                                    <span className="block text-[10px] uppercase text-orange-600 dark:text-orange-400 mb-1 font-semibold">Por Facturar</span>
                                                    <span className="font-mono text-lg font-semibold text-orange-700 dark:text-orange-300 block">
                                                        ${financials.pendingToInvoiceGross.toLocaleString()}
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
                                                        ${financials.receivableGross.toLocaleString()}
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
                        <ProjectSettings project={project} clients={clients} />

                        <div>
                            <h3 className="text-lg font-medium text-foreground mb-4">Registro de Actividad</h3>
                            <div className="bg-card rounded-xl border border-border p-6">
                                <AuditLog logs={auditLogs} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODALS */}
            {isItemsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-2xl rounded-xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                            <h3 className="font-bold text-lg">Ítems de Cotización</h3>
                            <button onClick={() => setIsItemsModalOpen(false)} className="p-1 hover:bg-zinc-200 rounded-full dark:hover:bg-zinc-700 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-0 overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground font-medium sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Detalle</th>
                                        <th className="px-4 py-2 text-center">Cant.</th>
                                        <th className="px-4 py-2 text-right">Costo U.</th>
                                        <th className="px-4 py-2 text-right">Precio U.</th>
                                        <th className="px-4 py-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {project.quoteItems.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-muted/30">
                                            <td className="px-4 py-2 font-medium">{item.detail}</td>
                                            <td className="px-4 py-2 text-center">{item.quantity}</td>
                                            <td className="px-4 py-2 text-right font-mono text-zinc-500">${item.costNet.toLocaleString()}</td>
                                            <td className="px-4 py-2 text-right font-mono text-foreground">${item.priceNet.toLocaleString()}</td>
                                            <td className="px-4 py-2 text-right font-bold">${(item.priceNet * item.quantity).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-border bg-muted/10 text-right">
                            <button onClick={() => setIsItemsModalOpen(false)} className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {isCostsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-2xl rounded-xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                            <h3 className="font-bold text-lg">Gastos Registrados</h3>
                            <button onClick={() => setIsCostsModalOpen(false)} className="p-1 hover:bg-zinc-200 rounded-full dark:hover:bg-zinc-700 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-0 overflow-auto">
                            {project.costEntries.length === 0 ? (
                                <p className="p-6 text-center text-muted-foreground">No hay gastos registrados.</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 text-muted-foreground font-medium sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Fecha</th>
                                            <th className="px-4 py-2 text-left">Categoría</th>
                                            <th className="px-4 py-2 text-left">Descripción</th>
                                            <th className="px-4 py-2 text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {project.costEntries.map((cost: any) => (
                                            <tr key={cost.id} className="hover:bg-muted/30">
                                                <td className="px-4 py-2 text-muted-foreground">{format(new Date(cost.date), 'dd/MM/yy')}</td>
                                                <td className="px-4 py-2">
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border">
                                                        {cost.category}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 font-medium">{cost.description}</td>
                                                <td className="px-4 py-2 text-right font-mono font-bold text-amber-600">${cost.amountNet.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="p-4 border-t border-border bg-muted/10 text-right">
                            <button onClick={() => setIsCostsModalOpen(false)} className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">Cerrar</button>
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
