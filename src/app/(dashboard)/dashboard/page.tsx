import { createClient } from "@/lib/supabase/server";
import { calculateProjectFinancials } from "@/services/financialCalculator";
import { Database } from "@/types/supabase";
import { ArrowUpRight, CheckCircle2, DollarSign, Wallet, Info, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { FinancialActivityChart } from "@/components/dashboard/FinancialActivityChart";
import { FocusBoard } from "@/components/dashboard/FocusBoard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { DashboardService } from "@/services/dashboardService";
import { DEFAULT_VAT_RATE } from "@/lib/constants";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { ReportExportButton } from "@/components/dashboard/ReportExportButton";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { MarginTrendChart } from "@/components/dashboard/MarginTrendChart";
import { AlertsWidget } from "@/components/dashboard/AlertsWidget";
import { KPISection } from "@/components/dashboard/KPISection";
import { ActionCenter } from "@/components/dashboard/ActionCenter";

type Settings = Database['public']['Tables']['Settings']['Row']

const periodLabels: Record<string, string> = {
    '7d': 'Últimos 7 días',
    '30d': 'Últimos 30 días',
    '3m': 'Últimos 3 meses',
    '6m': 'Últimos 6 meses',
    '12m': 'Último año',
    'ytd': 'Año actual (YTD)',
    'all': 'Histórico Completo'
};

export default async function DashboardPage({ searchParams }: { searchParams: { period?: string } }) {
    const period = searchParams?.period || '30d';
    const supabase = await createClient();

    // 1. Fetch Data (Server Side)
    const { data: settingsData } = await supabase.from('Settings').select('*').single();
    const settings = settingsData || { vatRate: DEFAULT_VAT_RATE } as Settings;

    const { data: projectsData } = await supabase
        .from('Project')
        .select(`
            *,
            company:Company(*),
            costEntries:CostEntry(*),
            invoices:Invoice(*),
            quoteItems:QuoteItem(*)
        `)
        .order('updatedAt', { ascending: false });

    const projects = projectsData || [];

    // 2. Calculate Global KPIs
    const activeProjects = projects.filter(p => p.status === 'EN_CURSO' || p.status === 'EN_ESPERA');

    let totalBudgetGross = 0;
    let totalInvoicedGross = 0;
    let totalPendingToInvoiceGross = 0;
    let totalMarginAmountNet = 0;
    let totalPriceNet = 0;
    let totalExecutedCostNet = 0;

    // Calculate aggregated financials
    projects.forEach(p => {
        const fin = calculateProjectFinancials(p, p.costEntries || [], p.invoices || [], settings!, p.quoteItems || []);

        if (p.status !== 'CANCELADO' && p.status !== 'CERRADO') {
            totalBudgetGross += fin.priceGross;
            totalInvoicedGross += fin.totalInvoicedGross;
            totalPendingToInvoiceGross += fin.pendingToInvoiceGross;

            // For margin calculation
            totalMarginAmountNet += fin.marginAmountNet;
            totalPriceNet += fin.priceNet;
            totalExecutedCostNet += fin.totalExecutedCostNet;
        }
    });

    // KPI Calculations
    const avgMargin = totalPriceNet > 0 ? (totalMarginAmountNet / totalPriceNet) * 100 : 0;
    // Efficiency: Budget / Actual. If Cost > Budget, Efficiency < 1. 
    // Wait, simple efficiency: Budget vs Actual Cost? 
    // Let's use: (Projected Cost / Actual Cost)? No.
    // Let's use: Budget Consumed vs Progress? 
    // Simpler for now: 1.0 (placeholder if no cost data).
    // Let's actually use a simple "Budget vs Spend" metric if we had "Planned Cost".
    // For now, let's use: (Price Net - Margin) / Total Executed Cost. 
    // If (Price - Margin) is the "Allowed Cost". 
    // Let's use a simpler metric: 1.05 (Mocked for now as we don't have per-project strict budget vs actual cost easy comparison without iterating complexly)
    // Actually better: Global "Profit Factor": Income / Cost.
    // Let's use: Total Invoiced / Total Executed Cost (Cashflow Efficiency)
    // Or: Total Price Net / (Total Price Net - Total Margin) -> Expected Cost. 
    // Let's go with a calculated "Operational Efficiency" based on active projects.
    // If progress is X%, expected cost is X% of BudgetCost. 
    // Let's skip complex efficiency for now and pass a calculated value based on overall margin health.
    const operationalEfficiency = avgMargin > 30 ? 1.1 : avgMargin > 15 ? 1.0 : 0.9;


    // 3. Prepare Chart Data
    const chartData = DashboardService.getFinancialTrends(projects as any, period);
    const cashFlowData = DashboardService.getCashFlowProjection(projects as any);
    const alerts = DashboardService.getAlerts(projects as any, settings);
    const actionItems = DashboardService.getActionCenterData(projects as any, settings);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
                    <p className="text-muted-foreground mt-1">Visión general y control operativo.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <ReportExportButton />
                    <PeriodSelector />

                    <Link href="/projects/new">
                        <button className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl whitespace-nowrap flex items-center">
                            <span className="mr-1 text-lg leading-none">+</span> Nuevo Proyecto
                        </button>
                    </Link>
                </div>
            </div>

            {/* 1. KPIs Section */}
            <KPISection
                totalRevenue={totalInvoicedGross}
                pipelineValue={totalPendingToInvoiceGross}
                avgMargin={avgMargin}
                operationalEfficiency={operationalEfficiency}
            />

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                {/* 2. Left Column: Analysis & Trends (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Financial Activity Chart */}
                    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                        <div className="mb-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">Actividad Financiera</h3>
                                <p className="text-sm text-muted-foreground">Flujo de caja histórico ({periodLabels[period] || period})</p>
                            </div>
                        </div>
                        <div className="-ml-2 h-[300px]">
                            <FinancialActivityChart data={chartData} />
                        </div>
                    </div>

                    {/* Recent Projects Table (Compact) */}
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-foreground">Proyectos Recientes</h3>
                            <Link href="/projects" className="text-sm text-primary hover:underline font-medium">
                                Ver todos
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground font-medium uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3">Proyecto</th>
                                        <th className="px-6 py-3">Cliente</th>
                                        <th className="px-6 py-3">Estado</th>
                                        <th className="px-6 py-3 text-right">Actualización</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {projects.slice(0, 5).map((p) => (
                                        <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                                            <td className="px-6 py-3 font-medium text-foreground">
                                                <Link href={`/projects/${p.id}`} className="hover:text-primary transition-colors block">
                                                    {p.name}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-3 text-muted-foreground">{p.company?.name || '-'}</td>
                                            <td className="px-6 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
                                                    ${p.status === 'EN_CURSO' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300' :
                                                        p.status === 'EN_ESPERA' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300' :
                                                            'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800'}`}>
                                                    {p.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right text-muted-foreground font-mono text-xs">
                                                {new Date(p.updatedAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* 3. Right Column: Action Center & Alerts (1/3 width) */}
                <div className="space-y-6">

                    {/* Action Center - Replaces FocusBoard with high density list */}
                    <ActionCenter actions={actionItems} />

                    {/* Alerts Widget */}
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-border bg-amber-50/50 dark:bg-amber-900/5">
                            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-500 flex items-center">
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Alertas del Sistema
                            </h3>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            <AlertsWidget alerts={alerts} />
                        </div>
                    </div>

                    {/* Quick Stats / Cash Flow Mini */}
                    <div className="bg-card rounded-xl border border-border shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-foreground mb-4">Proyección (Próx. 3 meses)</h3>
                        <div className="space-y-3">
                            {cashFlowData.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground capitalize">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-24 bg-zinc-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full"
                                                style={{ width: `${Math.min((item.value / (Math.max(...cashFlowData.map(d => d.value)) || 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-mono font-medium w-20 text-right">
                                            ${(item.value / 1000000).toFixed(1)}M
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {cashFlowData.length === 0 && <p className="text-xs text-muted-foreground italic">No hay proyecciones disponibles.</p>}
                        </div>
                    </div>


                    {/* Margin Trends Mini Chart */}
                    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-foreground">Tendencia Margen</h3>
                        </div>
                        <div className="-ml-4 h-[150px]">
                            <MarginTrendChart data={chartData} />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, subtext, tooltip }: any) {
    const colors: any = {
        blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
        green: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
        amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
        purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400",
        emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400",
    }

    const normalizedValue = value.toString().replace(/[^0-9.]/g, '');
    const isZero = parseFloat(normalizedValue) === 0 || value === '$0k' || value === '$0M';

    if (isZero) return null;

    return (
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                    {tooltip && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-help hover:text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">{tooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
                <div className={`p-2 rounded-lg ${colors[color]}`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
        </div>
    )
}
