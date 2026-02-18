import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import Link from "next/link";
import { QrCode } from "lucide-react";
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
import InventoryAlertsWidget from "@/components/dashboard/InventoryAlertsWidget";
import { SentinelService } from "@/services/sentinel";
import { SentinelWidget } from "@/components/dashboard/SentinelWidget";
import { SentinelAlertsPanel } from "@/components/dashboard/SentinelAlertsPanel";
import { NextBestAction } from "@/components/dashboard/NextBestAction";
import { getOrganizationId } from "@/lib/current-org";
import { OnboardingGuide } from "@/components/dashboard/OnboardingGuide";
import prisma from "@/lib/prisma";


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

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string; sentinel_force?: string }> }) {
    const params = await searchParams;
    const period = params?.period || '30d';
    const isSentinelForce = params?.sentinel_force === 'true';
    const supabase = await createClient();

    // 1. Fetch Data (Server Side)
    // Parallel fetching for performance
    let settingsRes: any = { data: null };
    let projectsRes: any = { data: [] };
    let opportunitiesRes: any = { data: [] };
    let tasksRes: any = { data: [] };
    let dollarRate = { value: 855 }; // Safe default

    try {
        const results = await Promise.all([
            supabase.from('Settings').select('*').maybeSingle(),
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
            supabase.from('Task')
                .select('*, project:Project(id, name, company:Company(name))')
                .eq('status', 'PENDING')
                .order('priority', { ascending: false })
                .order('dueDate', { ascending: true })
                .limit(20),
            getDollarRate()
        ]);

        settingsRes = { data: results[0].data };
        projectsRes = { data: results[1].data };
        opportunitiesRes = { data: results[2].data };
        tasksRes = { data: results[3].data };
        dollarRate = results[4];
    } catch (error) {
        console.error("[Dashboard] Initial data fetch failed:", error);
        // Fallback or handle partial failure
    }

    const settings = settingsRes.data || { vatRate: DEFAULT_VAT_RATE } as Settings;
    const projects = projectsRes.data || [];
    const opportunities = opportunitiesRes.data || [];
    const orgId = await getOrganizationId();

    // 2. Trigger Sentinel Analysis (Proactive Layer)
    if (orgId) {
        try {
            await Promise.all([
                SentinelService.runAnalysis(orgId, isSentinelForce),
                SentinelService.updateOrgStats(orgId),
                // [Activation] Ensure Org Created is tracked (PLG entry point)
                import("@/services/activation-service").then(({ ActivationService }) =>
                    ActivationService.trackFirst('ORG_CREATED', orgId)
                )
            ]);
        } catch (error) {
            console.error("[Dashboard] Sentinel analysis failed:", error);
            // Non-blocking error for main dashboard load
        }
    }

    // 3. Fetch Sentinel Active Alerts
    const { data: sentinelAlerts } = orgId
        ? await SentinelService.getActiveAlerts(orgId)
        : { data: [] };

    // 4. Calculate Dashboard Data
    const kpis = DashboardService.getGlobalKPIs(projects, opportunities, period, settings, dollarRate.value);
    const chartData = DashboardService.getFinancialTrends(projects as any, period);
    const topClients = DashboardService.getTopClients(projects as any);

    // 5. Fetch Stats & Sub Status for Onboarding
    const [orgStats, subscription] = await Promise.all([
        orgId ? prisma.organizationStats.findUnique({ where: { organizationId: orgId } }) : null,
        orgId ? prisma.subscription.findUnique({ where: { organizationId: orgId }, select: { status: true } }) : null
    ]);
    const isTrialing = subscription?.status === 'TRIALING';

    const { actions: sortedActions, nextBestAction } = DashboardService.getActionCenterData(
        projects as any,
        settings,
        opportunities as any,
        tasksRes.data || [],
        sentinelAlerts || [],
        orgStats,
        isTrialing
    );
    const deadlines = DashboardService.getUpcomingDeadlines(projects as any, settings);

    // Filter billing alerts (Invoices due soon)
    const billingAlerts = deadlines.filter(a => a.type === 'INVOICE');

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent inline-block mb-1">Command Center</h2>
                    <p className="text-muted-foreground">Visión estratégica y operativa en tiempo real.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <Link href="/inventory/scan">
                        <button className="bg-white dark:bg-zinc-800 border border-border hover:bg-zinc-50 dark:hover:bg-zinc-700 text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center">
                            <QrCode className="w-4 h-4 mr-2" /> QR
                        </button>
                    </Link>
                    <ReportExportButton />
                    <PeriodSelector />
                    <Link href="/projects/new">
                        <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 whitespace-nowrap flex items-center">
                            <span className="mr-1 text-lg leading-none">+</span> Nuevo Proyecto
                        </button>
                    </Link>
                </div>
            </div>

            {/* Onboarding Guide (Trial focus) */}
            {isTrialing && (
                <OnboardingGuide stats={orgStats} />
            )}

            {/* 1. KPIs Section */}
            <DashboardKPIs data={kpis} />

            {/* 2. Proactive Layer (Sentinel Top Pick) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <NextBestAction action={nextBestAction as any} />
                </div>
                <div className="hidden lg:block lg:col-span-1">
                    <div className="bg-zinc-900 rounded-xl p-6 text-white h-full flex flex-col justify-center">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Estado General</h4>
                        <div className="text-3xl font-bold">Saludable</div>
                        <p className="text-[10px] text-zinc-500 mt-2">Sentinel monitorizando 5 parámetros críticos.</p>
                    </div>
                </div>
            </div>

            {/* 3. Main Grid Layout */}
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

                    {/* Action Center - Unified Tasks */}
                    <div className="flex-1">
                        <TasksWidget tasks={sortedActions.slice(0, 15) as any} />
                    </div>
                </div>

                {/* Right Column: Sentinel & Widgets Stack */}
                <div className="space-y-6 flex flex-col">
                    {/* Sentinel Alerts Panel */}
                    <div className="flex-shrink-0">
                        <SentinelAlertsPanel alerts={sentinelAlerts as any || []} />
                    </div>

                    {/* Inventory Alerts (Fallback/Detailed) */}
                    <div className="flex-shrink-0">
                        <InventoryAlertsWidget />
                    </div>

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

            {/* 4. Gantt Chart Section */}
            <div className="mt-6">
                <div className="bg-card rounded-xl border border-border shadow-sm p-1 hover:shadow-md transition-shadow duration-300">
                    <ProjectGantt projects={projects as any} />
                </div>
            </div>
        </div >
    );
}
