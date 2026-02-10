import { createClient } from "@/lib/supabase/server";
import { calculateProjectFinancials } from "@/services/financialCalculator";
import { Database } from "@/types/supabase";
import { ArrowUpRight, CheckCircle2, DollarSign, Wallet, Info, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { FinancialActivityChart } from "@/components/dashboard/FinancialActivityChart";
import { FocusBoard } from "@/components/dashboard/FocusBoard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { DashboardService } from "@/services/dashboardService";
import { getDollarRate } from "@/services/currency";
import { DEFAULT_VAT_RATE, EXCHANGE_RATE_USD_CLP } from "@/lib/constants";
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

    // 1.5 Fetch Exchange Rate
    const exchangeRateInfo = await getDollarRate();
    const currentRate = exchangeRateInfo.value;

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
            const rate = p.currency === 'USD' ? currentRate : 1;

            totalBudgetGross += fin.priceGross * rate;
            totalInvoicedGross += fin.totalInvoicedGross * rate;
            totalPendingToInvoiceGross += fin.pendingToInvoiceGross * rate;

            // For margin calculation
            totalMarginAmountNet += fin.marginAmountNet * rate;
            totalPriceNet += fin.priceNet * rate;
            totalExecutedCostNet += fin.totalExecutedCostNet * rate;
        }
    });

    // KPI Calculations
    const avgMargin = totalPriceNet > 0 ? (totalMarginAmountNet / totalPriceNet) * 100 : 0;

    // Calculate Average Margin Amount per Active Project
    // We filter out cancelled/closed for the sum, so we should divide by the count of those same projects.
    // The 'activeProjects' array above (EN_CURSO, EN_ESPERA) might not strictly match the loop's if condition if we want to include all non-cancelled.
    // Let's count how many projects contributed to totalMarginAmountNet.
    const projectsWithFinancials = projects.filter(p => p.status !== 'CANCELADO' && p.status !== 'CERRADO').length;
    const avgMarginAmount = projectsWithFinancials > 0 ? totalMarginAmountNet / projectsWithFinancials : 0;

    // 3. Prepare Chart Data
    const chartData = DashboardService.getFinancialTrends(projects as any, period);
    const cashFlowData = DashboardService.getCashFlowProjection(projects as any);

    // Focus Board Data
    const rawActions = DashboardService.getActionCenterData(projects as any, settings);
    const alerts = rawActions
        .filter(a => a.priority === 'HIGH' || a.type === 'BLOCKER')
        .map(a => ({
            ...a,
            dueDate: a.dueDate ? a.dueDate.toISOString() : undefined
        }));

    const recentProjects = projects.slice(0, 5).map(p => ({
        id: p.id,
        name: p.name,
        companyName: p.company?.name || 'Sin Cliente',
        updatedAt: p.updatedAt,
        status: p.status
    }));

    const upcomingDeadlines = DashboardService.getUpcomingDeadlines(projects as any, settings)
        .map(d => ({
            ...d,
            date: d.date.toISOString()
        }));

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
                marginAmount={totalMarginAmountNet}
                exchangeRateInfo={exchangeRateInfo}
            />

            {/* 2. Main Dashboard Content - Big Picture Layout */}
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-12 h-full">

                {/* LEFT COLUMN: Financial Overview & Trends (Cols 1-4) */}
                <div className="lg:col-span-4 space-y-6 flex flex-col h-full">

                    {/* Financial Activity Chart */}
                    <div className="bg-card rounded-xl border border-border shadow-sm p-6 flex-1 min-h-[400px]">
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

                    {/* Quick Stats / Cash Flow Mini */}
                    <div className="bg-card rounded-xl border border-border shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-foreground mb-4">Proyección (Próx. 3 meses)</h3>
                        <div className="space-y-3">
                            {cashFlowData.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground capitalize">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-24 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full"
                                                style={{ width: `${Math.min((item.value / (Math.max(...cashFlowData.map(d => d.value)) || 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-mono font-medium w-20 text-right text-foreground">
                                            ${(item.value / 1000000).toFixed(1)}M
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {cashFlowData.length === 0 && <p className="text-xs text-muted-foreground italic">No hay proyecciones disponibles.</p>}
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN: Focus Board (Cols 5-12) */}
                <div className="lg:col-span-8 flex flex-col h-full space-y-6">

                    {/* Focus Board Title */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                            Tablero de Enfoque
                        </h3>
                    </div>

                    <div className="flex-1">
                        <FocusBoard
                            alerts={alerts}
                            recentProjects={recentProjects}
                            upcomingDeadlines={upcomingDeadlines}
                        />
                    </div>

                    {/* Recent Projects Table (Moved to bottom of Focus Board area or below) */}
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
                            <h3 className="text-sm font-semibold text-foreground">Proyectos Recientes</h3>
                            <Link href="/projects" className="text-xs text-primary hover:underline font-medium">
                                Ver todos
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground font-medium uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-2">Proyecto</th>
                                        <th className="px-4 py-2">Cliente</th>
                                        <th className="px-4 py-2">Estado</th>
                                        <th className="px-4 py-2 text-right">Actualización</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {projects.slice(0, 3).map((p) => (
                                        <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                                            <td className="px-4 py-2 font-medium text-foreground">
                                                <Link href={`/projects/${p.id}`} className="hover:text-primary transition-colors block truncate max-w-[150px]">
                                                    {p.name}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-2 text-muted-foreground truncate max-w-[120px]">{p.company?.name || '-'}</td>
                                            <td className="px-4 py-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border
                                                    ${p.status === 'EN_CURSO' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300' :
                                                        p.status === 'EN_ESPERA' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300' :
                                                            'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800'}`}>
                                                    {p.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-right text-muted-foreground font-mono text-[10px]">
                                                {new Date(p.updatedAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div >
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
