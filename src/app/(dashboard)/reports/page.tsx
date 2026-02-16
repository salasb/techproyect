// Imports updated
import { createClient } from "@/lib/supabase/server";
import { calculateProjectFinancials, MinimalCostEntry, MinimalInvoice, MinimalProject } from "@/services/financialCalculator";
import { RevenueChart } from "@/components/reports/RevenueChart";
import { ProjectMarginChart } from "@/components/reports/ProjectMarginChart";
import { ClientRevenuePie } from "@/components/reports/ClientRevenuePie";
import { TrendingUp, PieChart, FileText, AlertCircle, Package } from "lucide-react";
import { format } from "date-fns";
import { DashboardService } from "@/services/dashboardService";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import Link from "next/link";
import { getInventoryMetrics } from "@/app/actions/inventory-analytics";
import { InventoryAnalytics } from "@/components/reports/InventoryAnalytics";
import { ReportsTabs } from "@/components/reports/ReportsTabs";
import { LocationSelector } from "@/components/reports/LocationSelector";

export const dynamic = 'force-dynamic';

export default async function ReportsPage({ searchParams }: { searchParams: { period?: string, view?: string, locationId?: string } }) {
    const supabase = await createClient();
    const period = searchParams.period || '6m';
    const view = searchParams.view || 'financial'; // 'financial' | 'inventory'
    const locationId = searchParams.locationId;

    // Fetch filters if needed (Locations)
    const { data: locations } = await supabase.from('Location').select('id, name');

    const header = (
        <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    {view === 'inventory' ? 'Reportes de Inventario' : 'Reportes Financieros'}
                </h2>
                <p className="text-muted-foreground">
                    {view === 'inventory'
                        ? 'Utilización, costos y distribución de stock.'
                        : 'Análisis detallado del rendimiento de tu negocio.'
                    }
                </p>
            </div>
            <div className="flex items-center gap-4">
                <ReportsTabs />

                {view === 'inventory' && locations && (
                    <LocationSelector locations={locations} />
                )}

                <span className="text-xs text-muted-foreground hidden md:inline-block">
                    Actualizado: {format(new Date(), 'dd/MM/yy HH:mm')}
                </span>
                <PeriodSelector />
            </div>
        </div>
    );

    // Inventory View Logic
    if (view === 'inventory') {
        const inventoryMetrics = await getInventoryMetrics(locationId);
        return (
            <div className="space-y-6">
                {header}
                <InventoryAnalytics metrics={inventoryMetrics} />
            </div>
        );
    }

    // Existing Financial View Logic
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

    // 2. Process Financials
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

    const financialTrends = DashboardService.getFinancialTrends(projects, period);
    const topClients = DashboardService.getTopClients(projects);
    const projectMargins = DashboardService.getProjectMargins(processedProjects);

    const totalRevenue = processedProjects.reduce((acc: number, p: any) => acc + p.financials.priceNet, 0);
    const totalMargin = processedProjects.reduce((acc: number, p: any) => acc + p.financials.marginAmountNet, 0);
    const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    const activeProjects = processedProjects.filter((p: any) => p.status !== 'CERRADO' && p.status !== 'COMPLETADO').length;
    const pendingQuotes = processedProjects.filter((p: any) => p.stage === 'LEVANTAMIENTO').length;

    return (
        <div className="space-y-6">
            {header}

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RevenueChart data={financialTrends} />
                </div>
                <div>
                    <ClientRevenuePie data={topClients} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <ProjectMarginChart data={projectMargins} />
            </div>
        </div>
    );
}
