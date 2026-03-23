import { generateId } from "@/lib/id";
import { RevenueChart } from "@/components/reports/RevenueChart";
import { ProjectMarginChart } from "@/components/reports/ProjectMarginChart";
import { ClientRevenuePie } from "@/components/reports/ClientRevenuePie";
import { TrendingUp, PieChart, FileText, AlertCircle, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { DashboardService } from "@/services/dashboardService";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { getInventoryMetrics } from "@/app/actions/inventory-analytics";
import { InventoryAnalytics } from "@/components/reports/InventoryAnalytics";
import { ReportsTabs } from "@/components/reports/ReportsTabs";
import { LocationSelector } from "@/components/reports/LocationSelector";
import { getOrganizationId } from "@/lib/current-org";
import prisma from "@/lib/prisma";
import { FinancialDomain } from "@/services/financialDomain";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = 'force-dynamic';

export default async function ReportsPage(props: { searchParams: Promise<{ period?: string, view?: string, locationId?: string }> }) {
    const traceId = `REP-FIN-${generateId().split("-")[0].toUpperCase()}`;
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

    // 1. Data Fetching
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
            <div className="space-y-8 max-w-7xl mx-auto p-8 animate-in fade-in duration-500 pb-20">
                {header}
                <InventoryAnalytics metrics={JSON.parse(JSON.stringify(inventoryMetrics))} />
                <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest text-center">Trace ID: {traceId}</p>
            </div>
        );
    }

    // Financial View Logic
    const safeSettings = settings || {
        vatRate: 0.19,
        yellowThresholdDays: 7,
        defaultPaymentTermsDays: 30
    };

    const domainKPIs = FinancialDomain.aggregateCollection(projectsRaw as any, safeSettings as any);

    const processedProjects = projectsRaw.map((p) => ({
        ...p,
        financials: FinancialDomain.getProjectSnapshot(p as any, safeSettings as any),
        clientName: p.client?.name || p.company?.name || 'Sin Cliente'
    }));

    const financialTrends = DashboardService.getFinancialTrends(projectsRaw as any, period, safeSettings as any, 1);
    const topClients = DashboardService.getTopClients(projectsRaw as any, safeSettings as any, 1);
    const projectMargins = DashboardService.getProjectMargins(processedProjects as any);

    const totalRevenue = domainKPIs.totalRevenue;
    const avgMarginPct = domainKPIs.avgMarginPct;
    const activeProjects = domainKPIs.activeProjectsCount;
    const pendingQuotes = domainKPIs.pendingQuotesCount;

    const hasData = totalRevenue > 0 || domainKPIs.totalMargin > 0 || activeProjects > 0 || pendingQuotes > 0;

    // Serialization for Client Components
    const sanitizedFinancialTrends = JSON.parse(JSON.stringify(financialTrends));
    const sanitizedTopClients = JSON.parse(JSON.stringify(topClients));
    const sanitizedProjectMargins = JSON.parse(JSON.stringify(projectMargins));

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-8 animate-in fade-in duration-500 pb-20">
            {header}

            {!hasData ? (
                <EmptyState 
                    variant="card"
                    icon={BarChart3}
                    title="No hay actividad financiera consolidada"
                    description="Este panel se completa con proyectos activos, facturación emitida o cotizaciones aceptadas. Comienza estructurando tu primer negocio."
                    actionLabel="Crear Primer Proyecto"
                    actionHref="/projects/new"
                />
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { title: "Venta Neta Proyectada", value: FinancialDomain.formatCurrency(totalRevenue), icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
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
                            <RevenueChart data={sanitizedFinancialTrends} />
                        </div>
                        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-widest italic text-zinc-400 mb-6">Distribución por Cliente</h3>
                            <ClientRevenuePie data={sanitizedTopClients} />
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm overflow-hidden">
                        <h3 className="text-sm font-black uppercase tracking-widest italic text-zinc-400 mb-6">Análisis de Márgenes por Proyecto</h3>
                        <ProjectMarginChart data={sanitizedProjectMargins} />
                    </div>
                </>
            )}
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest text-center">Trace ID: {traceId}</p>
        </div>
    );
}
