'use client'

import { useState } from "react";
import { Database } from "@/types/supabase";
import { FinancialResult } from "@/services/financialCalculator";
import { ArrowUpRight, Calendar, DollarSign, Wallet } from "lucide-react";
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
    project: Project & { company: Company; costEntries: CostEntry[]; invoices: Invoice[]; quoteItems: QuoteItem[] };
    financials: FinancialResult;
    settings?: Settings;
    auditLogs: AuditLogEntry[];
    projectLogs: ProjectLog[];
}

export function ProjectDetailView({ project, financials, settings, auditLogs, projectLogs }: Props) {
    const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'financials' | 'settings' | 'logs'>('overview');

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
                    <div className="space-y-8">
                        {/* Metrics Grid */}
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            <MetricCard
                                title="Presupuesto Base"
                                value={`$${financials.baseCostNet.toLocaleString()}`}
                                icon={DollarSign}
                                trend="Costo Neto"
                            />
                            <MetricCard
                                title="Precio Venta"
                                value={`$${financials.priceNet.toLocaleString()}`}
                                icon={Wallet}
                                trend={`Margen: ${(project.marginPct * 100).toFixed(0)}%`}
                                trendColor={financials.marginAmountNet < 0 ? "text-red-600" : "text-green-600"}
                            />
                            <MetricCard
                                title="Facturado"
                                value={`$${financials.totalInvoicedGross.toLocaleString()}`}
                                icon={ArrowUpRight}
                                trend="Total Bruto"
                            />
                            <MetricCard
                                title="Fecha Entrega"
                                value={project.plannedEndDate ? new Date(project.plannedEndDate).toLocaleDateString() : 'Por definir'}
                                icon={Calendar}
                                trend={`${financials.trafficLightTime === 'RED' ? 'Atrasado' : 'En plazo'}`}
                                trendColor={financials.trafficLightTime === 'RED' ? 'text-destructive' : 'text-green-500'}
                            />
                        </div>

                        <ProjectScope project={project} />
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
                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Estructura de Precio</h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-sm group">
                                                <div>
                                                    <span className="text-muted-foreground group-hover:text-foreground transition-colors block">Costo Directo</span>
                                                    {project.quoteItems && project.quoteItems.length > 0 && (
                                                        <span className="text-[10px] text-blue-500 font-medium">
                                                            (Basado en {project.quoteItems.length} ítems)
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="font-mono font-bold text-lg text-zinc-700 dark:text-zinc-300">
                                                    ${financials.baseCostNet.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm group">
                                                <span className="text-muted-foreground flex items-center group-hover:text-foreground transition-colors">
                                                    Margen
                                                    {(() => {
                                                        const marginPct = financials.priceNet > 0 ? (financials.marginAmountNet / financials.priceNet) * 100 : 0;
                                                        const isNegative = marginPct < 0;
                                                        return (
                                                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-bold ${isNegative
                                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse'
                                                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                }`}>
                                                                {marginPct.toFixed(1)}%
                                                            </span>
                                                        );
                                                    })()}
                                                </span>
                                                <span className={`font-mono font-bold text-lg ${financials.marginAmountNet < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-500'}`}>
                                                    {financials.marginAmountNet > 0 ? '+' : ''}${financials.marginAmountNet.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="pt-4 border-t border-border flex justify-between items-center">
                                                <span className="font-bold text-base text-foreground">Precio Neto</span>
                                                <span className="font-mono text-xl font-bold text-foreground">
                                                    ${financials.priceNet.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Total Block */}
                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 -mx-6 px-6 py-5 border-y border-blue-100 dark:border-blue-900/30 space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-blue-700 dark:text-blue-300">IVA ({(settings?.vatRate || 0.19) * 100}%)</span>
                                            <span className="font-mono font-medium text-blue-700 dark:text-blue-300">+${financials.vatAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-baseline pt-1">
                                            <span className="text-base font-bold text-blue-900 dark:text-blue-100">Total Bruto</span>
                                            <span className="font-mono text-2xl font-bold text-blue-700 dark:text-blue-400 tracking-tight">${financials.priceGross.toLocaleString()}</span>
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
                        <ProjectSettings project={project} />

                        <div>
                            <h3 className="text-lg font-medium text-foreground mb-4">Registro de Actividad</h3>
                            <div className="bg-card rounded-xl border border-border p-6">
                                <AuditLog logs={auditLogs} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
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
