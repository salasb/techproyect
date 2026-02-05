import { createClient } from "@/lib/supabase/server";
import { calculateProjectFinancials, MinimalCostEntry, MinimalInvoice, MinimalProject } from "@/services/financialCalculator";
import { RevenueChart } from "@/components/reports/RevenueChart";
import { ProjectMarginChart } from "@/components/reports/ProjectMarginChart";
import { ClientRevenuePie } from "@/components/reports/ClientRevenuePie";
import { TrendingUp, PieChart, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { DashboardService } from "@/services/dashboardService";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";

export const dynamic = 'force-dynamic';

export default async function ReportsPage({ searchParams }: { searchParams: { period?: string } }) {
    const supabase = await createClient();
    const period = searchParams.period || '6m';

    // 1. Fetch Data
    const { data: projectsRaw } = await supabase
        .from('Project')
        .select(`
            *,
            company:Client(*),
            quoteItems:QuoteItem(*),
            costEntries:CostEntry(*),
            invoices:Invoice(*)
        `)
        .neq('status', 'CANCELADO');

    const { data: settingsRaw } = await supabase.from('Settings').select('*').single();
    const settings = settingsRaw || { vatRate: 0.19, yellowThresholdDays: 7, defaultPaymentTermsDays: 30 };

    const projects: any[] = projectsRaw || [];

    // 2. Process Financials for aggregations that need full project calculations (like Margins)
    const processedProjects = projects.map((p: any) => {
        const financials = calculateProjectFinancials(
            {
                budgetNet: p.budget || 0,
                marginPct: p.margin || 0.3,
                status: p.status,
                progress: p.progress,
                plannedEndDate: p.plannedEndDate
            } as MinimalProject,
            (p.costEntries || []) as MinimalCostEntry[],
            (p.invoices || []) as MinimalInvoice[],
            settings,
            p.quoteItems || []
        );

        return {
            ...p,
            financials,
            company: p.company, // Ensure strict typing/naming matches logic
            clientName: p.company?.name || 'Sin Cliente'
        };
    });

    // 3. Service Aggregations
    const financialTrends = DashboardService.getFinancialTrends(projects, period);
    const topClients = DashboardService.getTopClients(projects);
    const projectMargins = DashboardService.getProjectMargins(processedProjects);

    // 4. KPI Calcs
    const totalRevenue = processedProjects.reduce((acc: number, p: any) => acc + p.financials.priceNet, 0);
    const totalMargin = processedProjects.reduce((acc: number, p: any) => acc + p.financials.marginAmountNet, 0);
    const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    const activeProjects = processedProjects.filter((p: any) => p.status !== 'CERRADO' && p.status !== 'COMPLETADO').length;
    const pendingQuotes = processedProjects.filter((p: any) => p.stage === 'LEVANTAMIENTO').length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Reportes Financieros</h2>
                    <p className="text-muted-foreground">Análisis detallado del rendimiento de tu negocio.</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground hidden md:inline-block">
                        Actualizado: {format(new Date(), 'dd/MM/yy HH:mm')}
                    </span>
                    <PeriodSelector />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { title: "Venta Neta Total", value: `$${(totalRevenue / 1000000).toFixed(1)}M`, icon: TrendingUp, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" },
                    { title: "Margen Promedio", value: `${avgMarginPct.toFixed(1)}%`, icon: PieChart, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
                    { title: "Proyectos Activos", value: activeProjects.toString(), icon: FileText, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
                    { title: "Cotizaciones Pend.", value: pendingQuotes.toString(), icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
                ].map((stat, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-6 flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                            <h3 className="text-2xl font-bold text-foreground mt-2">{stat.value}</h3>
                        </div>
                        <div className={`p-3 rounded-lg ${stat.bg}`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RevenueChart data={financialTrends} />
                </div>
                <div>
                    <ClientRevenuePie data={topClients} />
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 gap-6">
                <ProjectMarginChart data={projectMargins} />
            </div>
        </div>
    );
}
