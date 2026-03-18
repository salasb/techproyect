import { calculateProjectFinancials, MinimalCostEntry, MinimalInvoice, MinimalProject, MinimalQuoteItem, MinimalSettings } from "@/services/financialCalculator";
import { RevenueChart } from "@/components/reports/RevenueChart";
import { ProjectMarginChart } from "@/components/reports/ProjectMarginChart";
import { ClientRevenuePie } from "@/components/reports/ClientRevenuePie";
import { TrendingUp, PieChart, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { DashboardService } from "@/services/dashboardService";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { getInventoryMetrics } from "@/app/actions/inventory-analytics";
import { InventoryAnalytics } from "@/components/reports/InventoryAnalytics";
import { ReportsTabs } from "@/components/reports/ReportsTabs";
import { LocationSelector } from "@/components/reports/LocationSelector";
import { getOrganizationId } from "@/lib/current-org";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function ReportsPage(props: { searchParams: Promise<{ period?: string, view?: string, locationId?: string }> }) {
    const traceId = `REP-FIN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const searchParams = await props.searchParams;
    const period = searchParams.period || '6m';
    const view = searchParams.view || 'financial';
    const locationId = searchParams.locationId;
    const orgId = await getOrganizationId();
    const startTime = Date.now();

    if (!orgId) {
        return <div className="p-12 text-center text-muted-foreground italic bg-muted/20 rounded-xl m-8 border-2 border-dashed border-border">
            Debes seleccionar una organización activa para ver reportes.
        </div>;
    }

    // 1. Data Fetching (outside try/catch for JSX safety)
    const [locations, settings, projectsRaw] = await Promise.all([
        prisma.location.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } }),
        prisma.settings.findFirst(),
        prisma.project.findMany({
            where: { organizationId: orgId, status: { not: 'CANCELADO' } },
            include: {
                company: true,
                client: true,
                quoteItems: true,
                costEntries: true,
                invoices: true
            }
        })
    ]);

    console.log(JSON.stringify({
        event: "OBSERVABILITY",
        traceId,
        route: "/reports",
        user: orgId,
        durationMs: Date.now() - startTime,
        sourceOfTruth: "DB/Prisma",
        result: "SUCCESS",
        fallbackReason: null
    }));

    const header = (
        <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    {view === 'inventory' ? 'Reportes de Inventario' : 'Reportes Financieros'}
                </h2>
                <p className="text-muted-foreground">
                    {view === 'inventory' ? 'Utilización y costos de stock.' : 'Análisis del rendimiento comercial.'}
                </p>
            </div>
            <div className="flex items-center gap-4">
                <ReportsTabs />
                {view === 'inventory' && <LocationSelector locations={locations as { id: string; name: string }[]} />}
                <span className="text-xs text-muted-foreground hidden md:inline-block">
                    Refresco: {format(new Date(), 'HH:mm')}
                </span>
                <PeriodSelector />
            </div>
        </div>
    );

    if (view === 'inventory') {
        const inventoryMetrics = await getInventoryMetrics(locationId);
        return (
            <div className="space-y-6 max-w-7xl mx-auto p-8 animate-in fade-in duration-500">
                {header}
                <InventoryAnalytics metrics={inventoryMetrics} />
            </div>
        );
    }

    // 2. Financial Processing
    const safeSettings = settings || { vatRate: 0.19, yellowThresholdDays: 7, defaultPaymentTermsDays: 30 };

    const processedProjects = projectsRaw.map((p) => {
        const quoteItems: MinimalQuoteItem[] = (p.quoteItems || []).map((qi) => {
            const item = qi as { priceNet: number; costNet: number; quantity: number; isSelected: boolean };
            return {
                priceNet: item.priceNet,
                costNet: item.costNet,
                quantity: item.quantity,
                isSelected: item.isSelected
            };
        });

        const financials = calculateProjectFinancials(
            {
                budgetNet: p.budgetNet || 0,
                marginPct: Number(p.marginPct) || 0.3,
                status: p.status,
                progress: p.progress || 0,
                plannedEndDate: p.plannedEndDate
            } as MinimalProject,
            (p.costEntries || []) as MinimalCostEntry[],
            (p.invoices || []) as MinimalInvoice[],
            safeSettings as MinimalSettings,
            quoteItems
        );

        return {
            ...p,
            financials,
            clientName: p.client?.name || p.company?.name || 'Sin Cliente'
        };
    });

    const financialTrends = DashboardService.getFinancialTrends(projectsRaw as any, period);
    const topClients = DashboardService.getTopClients(projectsRaw as any);
    const projectMargins = DashboardService.getProjectMargins(processedProjects as any);

    const totalRevenue = processedProjects.reduce((acc, p) => acc + p.financials.priceNet, 0);
    const totalMargin = processedProjects.reduce((acc, p) => acc + p.financials.marginAmountNet, 0);
    const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    
    // Count only truly active projects (exclude drafts without quote sent and closed/cancelled)
    const activeProjects = processedProjects.filter((p) => p.status === 'EN_CURSO' || p.status === 'EN_ESPERA' || p.status === 'BLOQUEADO').length;
    // Count pending quotes: Sent but not yet accepted
    const pendingQuotes = processedProjects.filter((p) => p.quoteSentDate && !p.acceptedAt).length;

    // A module shouldn't show $0.0M blindly if there is absolutely no financial data setup
    const hasData = totalRevenue > 0 || totalMargin > 0 || activeProjects > 0 || pendingQuotes > 0;

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-8 animate-in fade-in duration-500 pb-20">
            {header}

            {!hasData ? (
                <div className="p-20 text-center bg-muted/10 rounded-[2rem] border border-dashed border-border flex flex-col items-center justify-center space-y-4">
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-full shadow-sm border border-border">
                        <TrendingUp className="w-8 h-8 text-zinc-300" />
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-lg">No hay actividad financiera consolidada</p>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Este panel se completa con actividad financiera consolidada, facturación emitida o cotizaciones enviadas/aceptadas.
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { title: "Venta Neta Proyectada", value: `$${(totalRevenue / 1000000).toFixed(1)}M`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
                            { title: "Margen Promedio", value: `${avgMarginPct.toFixed(1)}%`, icon: PieChart, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
                            { title: "Proyectos en Curso", value: activeProjects.toString(), icon: FileText, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
                            { title: "Cotizaciones Pendientes", value: pendingQuotes.toString(), icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
                        ].map((stat, i) => (
                            <div key={i} className="bg-card border border-border rounded-2xl p-6 flex items-start justify-between shadow-sm hover:shadow-md transition-shadow">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic mb-1">{stat.title}</p>
                                    <h3 className="text-2xl font-black text-foreground tracking-tighter">{stat.value}</h3>
                                </div>
                                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 rounded-[2rem] border border-border bg-card p-8 shadow-sm overflow-hidden">
                            <h3 className="text-sm font-black uppercase tracking-widest italic text-zinc-400 mb-6">Tendencia de Ingresos vs Costos</h3>
                            <RevenueChart data={financialTrends} />
                        </div>
                        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-widest italic text-zinc-400 mb-6">Distribución por Cliente</h3>
                            <ClientRevenuePie data={topClients} />
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm overflow-hidden">
                        <h3 className="text-sm font-black uppercase tracking-widest italic text-zinc-400 mb-6">Análisis de Márgenes por Proyecto</h3>
                        <ProjectMarginChart data={projectMargins} />
                    </div>
                </>
            )}
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest text-center">Trace ID: {traceId}</p>
        </div>
    );
}
