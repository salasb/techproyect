import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import Link from "next/link";
import { DashboardService } from "@/services/dashboardService";
import { getDollarRate } from "@/services/currency";
import { DEFAULT_VAT_RATE } from "@/lib/constants";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { ReportExportButton } from "@/components/dashboard/ReportExportButton";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TasksWidget } from "@/components/dashboard/widgets/TasksWidget";
import { BillingAlertsWidget } from "@/components/dashboard/widgets/BillingAlertsWidget";
import { ClientRankingWidget } from "@/components/dashboard/widgets/ClientRankingWidget";
import { ProjectGantt } from "@/components/dashboard/ProjectGantt";
import { AiAssistantBanner } from "@/components/dashboard/AiAssistantBanner";

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
    // Parallel fetching for performance
    const [settingsRes, projectsRes, opportunitiesRes, dollarRate] = await Promise.all([
        supabase.from('Settings').select('*').single(),
        supabase.from('Project')
            .select(`
                *,
                company:Company(id, name, contactName, phone, email),
                costEntries:CostEntry(id, amountNet, date, description),
                invoices:Invoice(id, amountInvoicedGross, amountPaidGross, sent, sentDate, dueDate, paymentTermsDays),
                quoteItems:QuoteItem(id, priceNet, costNet, quantity, isSelected)
            `)
            .order('updatedAt', { ascending: false }),
        supabase.from('Opportunity').select('*'),
        getDollarRate()
    ]);

    const settings = settingsRes.data || { vatRate: DEFAULT_VAT_RATE } as Settings;
    const projects = projectsRes.data || [];
    const opportunities = opportunitiesRes.data || [];

    // 2. Calculate Dashboard Data
    const kpis = DashboardService.getGlobalKPIs(projects, opportunities, period, settings, dollarRate.value);
    const chartData = DashboardService.getFinancialTrends(projects as any, period);
    const topClients = DashboardService.getTopClients(projects as any);
    const actions = DashboardService.getActionCenterData(projects as any, settings);
    const alerts = DashboardService.getUpcomingDeadlines(projects as any, settings);

    // Filter tasks for widget (Pending tasks/follow-ups)
    const pendingTasks = actions.filter(a => !a.title.includes('Seguimiento') || a.priority === 'HIGH').slice(0, 10);

    // Filter billing alerts (Invoices due soon)
    const billingAlerts = alerts.filter(a => a.type === 'INVOICE');

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent inline-block mb-1">Command Center</h2>
                    <p className="text-muted-foreground">Visión estratégica y operativa en tiempo real.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <ReportExportButton />
                    <PeriodSelector />
                    <Link href="/projects/new">
                        <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 whitespace-nowrap flex items-center">
                            <span className="mr-1 text-lg leading-none">+</span> Nuevo Proyecto
                        </button>
                    </Link>
                </div>
            </div>

            {/* AI Banner - New Feature Visibility */}
            <div className="animate-in slide-in-from-top-4 fade-in duration-700">
                <AiAssistantBanner />
            </div>

            {/* 1. KPIs Section */}
            <DashboardKPIs data={kpis} />

            {/* 2. Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

                {/* Left Column: Revenue Chart (Span 2) */}
                <div className="lg:col-span-2 space-y-6 flex flex-col">
                    <div className="bg-card rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
                        <div className="mb-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">Tendencias Financieras</h3>
                                <p className="text-sm text-muted-foreground">Ingresos vs Costos ({periodLabels[period] || period})</p>
                            </div>
                        </div>
                        <RevenueChart data={chartData} />
                    </div>

                    {/* Pending Tasks Widget */}
                    <div className="flex-1">
                        <TasksWidget tasks={pendingTasks as any} />
                    </div>
                </div>

                {/* Right Column: Widgets Stack */}
                <div className="space-y-6 flex flex-col">
                    {/* Billing Alerts */}
                    <div className="flex-1">
                        <BillingAlertsWidget alerts={billingAlerts} />
                    </div>

                    {/* Top Clients */}
                    <div className="flex-1">
                        <ClientRankingWidget clients={topClients} />
                    </div>
                </div>
            </div>


            {/* 3. Gantt Chart Section */}
            <div className="mt-6">
                <div className="bg-card rounded-xl border border-border shadow-sm p-1 hover:shadow-md transition-shadow duration-300">
                    <ProjectGantt projects={projects as any} />
                </div>
            </div>
        </div >
    );
}
