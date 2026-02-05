
import { createClient } from "@/lib/supabase/server";
import { calculateProjectFinancials } from "@/services/financialCalculator";
import { Database } from "@/types/supabase";
import { ArrowUpRight, CheckCircle2, DollarSign, Wallet, Info } from "lucide-react";
import Link from "next/link";
import { FinancialActivityChart } from "@/components/dashboard/FinancialActivityChart";
import { FocusBoard } from "@/components/dashboard/FocusBoard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { DashboardService } from "@/services/dashboardService";
import { DEFAULT_VAT_RATE } from "@/lib/constants";

type Settings = Database['public']['Tables']['Settings']['Row']


import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { ProfitTrendCard } from "@/components/dashboard/ProfitTrendCard";

interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DashboardPage({ searchParams }: Props) {
    const resolvedSearchParams = await searchParams;
    const period = typeof resolvedSearchParams.period === 'string' ? resolvedSearchParams.period : '6m';

    const supabase = await createClient();

    // 1. Fetch Global Settings (VAT, etc)
    const { data: settingsData } = await supabase.from('Settings').select('*').single();
    const settings = settingsData || { vatRate: DEFAULT_VAT_RATE } as Settings;

    // 2. Fetch Projects (Active & Recent)
    const { data: projectsData } = await supabase
        .from('Project')
        .select(`
            *,
            company:Company(*),
            costEntries:CostEntry(*),
            invoices:Invoice(*)
        `)
        .order('updatedAt', { ascending: false });

    const projects = projectsData || [];

    // 3. Calculate Global KPIs
    const activeProjects = projects.filter(p => p.status === 'EN_CURSO' || p.status === 'EN_ESPERA');

    let totalBudgetGross = 0;
    let totalReceivableGross = 0;

    projects.forEach(p => {
        const fin = calculateProjectFinancials(p, p.costEntries || [], p.invoices || [], settings!);

        // Accumulate totals
        // Use priceGross (Project Total Value) for Budget Total
        if (p.status !== 'CANCELADO' && p.status !== 'CERRADO') {
            totalBudgetGross += fin.priceGross;
        }

        totalReceivableGross += fin.receivableGross;
    });

    const avgProgress = projects.length > 0
        ? (projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length).toFixed(0)
        : 0;

    // 4. Calculate Financial Trends for Chart
    const chartData = DashboardService.getFinancialTrends(projects as any, period);

    // 5. Calculate Dynamic Profit Trend
    const { trendData: profitTrendData, totalProfit } = DashboardService.getProfitTrend(projects as any, period);

    const periodLabels: Record<string, string> = {
        '30d': 'últimos 30 días',
        '6m': 'últimos 6 meses',
        '12m': 'último año',
        'all': 'histórico completo'
    };

    // Focus Board Data
    const { blockedProjects, focusProjects } = DashboardService.getFocusBoardData(projects as any);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
                    <p className="text-muted-foreground mt-1">Resumen general de tu operación.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <PeriodSelector />

                    <Link href="/projects/new">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 whitespace-nowrap">
                            + Nuevo Proyecto
                        </button>
                    </Link>
                </div>
            </div>

            <FocusBoard blockedProjects={blockedProjects} activeProjects={focusProjects} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Proyectos Activos"
                    value={activeProjects.length.toString()}
                    icon={CheckCircle2}
                    color="blue"
                    subtext="En curso o espera"
                    tooltip="Cantidad de proyectos en estado 'En Curso' o 'En Espera'."
                />
                <StatCard
                    title="Presupuesto Activo"
                    value={`$${(totalBudgetGross / 1000000).toFixed(1)}M`}
                    icon={Wallet}
                    color="green"
                    subtext="Valor total proyectos activos"
                    tooltip="Suma total del valor (Bruto) de todos los proyectos activos."
                />
                <StatCard
                    title="Por Cobrar"
                    value={`$${(totalReceivableGross / 1000).toFixed(0)}k`}
                    icon={DollarSign}
                    color="amber"
                    subtext="Facturas emitidas impagas"
                    tooltip="Suma de facturas enviadas que aún no han sido marcadas como pagadas."
                />

                {/* Dynamic Profit Card */}
                <ProfitTrendCard
                    title="Ganancia Real (Caja)"
                    value={totalProfit}
                    data={profitTrendData}
                    periodLabel={periodLabels[period] || 'periodo'}
                    tooltip="Diferencia real entre Ingresos (Facturado) y Gastos (Registrados). No incluye estimaciones."
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 bg-card rounded-xl border border-border shadow-sm p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-foreground">Actividad Financiera</h3>
                        <p className="text-sm text-muted-foreground">Ingresos vs Costos ({periodLabels[period] || 'periodo'})</p>
                    </div>

                    <div className="-ml-2">
                        <FinancialActivityChart data={chartData} />
                    </div>
                </div>

                <div className="col-span-3 bg-card rounded-xl border border-border shadow-sm p-6 overflow-hidden">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Últimos Proyectos</h3>
                    <div className="space-y-4">
                        {projects.slice(0, 5).map((p) => (
                            <div key={p.id} className="flex items-center group">
                                <div className="ml-0 space-y-1 flex-1">
                                    <Link href={`/projects/${p.id}`} className="text-sm font-medium leading-none text-foreground group-hover:text-primary transition-colors block truncate">
                                        {p.name}
                                    </Link>
                                    <p className="text-xs text-muted-foreground truncate">{p.company?.name || 'Sin Cliente'}</p>
                                </div>
                                <div className="ml-auto font-medium text-xs text-muted-foreground whitespace-nowrap">
                                    {new Date(p.updatedAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                        {projects.length === 0 && <p className="text-sm text-muted-foreground">No hay proyectos recientes.</p>}
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

