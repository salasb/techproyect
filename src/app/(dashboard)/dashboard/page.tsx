import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import Link from "next/link";
import { QrCode, Building2 } from "lucide-react";
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
import { SentinelAlertsPanel } from "@/components/dashboard/SentinelAlertsPanel";
import { NextBestAction } from "@/components/dashboard/NextBestAction";
import { ActivationChecklist } from "@/components/dashboard/ActivationChecklist";
import { WorkspaceSetupBanner } from "@/components/dashboard/WorkspaceSetupBanner";
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

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string; sentinel_force?: string; explore?: string }> }) {
    const params = await searchParams;
    const period = params?.period || '30d';
    const isSentinelForce = params?.sentinel_force === 'true';
    const isExplore = params?.explore === 'true';
    const supabase = await createClient();

    // 0. Resolve Workspace State (Node Runtime)
    const { getWorkspaceState } = await import('@/lib/auth/workspace-resolver');
    const workspace = await getWorkspaceState();
    const orgId = workspace.activeOrgId;
    const isSuperadmin = workspace.userRole === 'SUPERADMIN';
    const isDebugWorkspace = process.env.DEBUG_WORKSPACE === '1';

    // 1. Fetch Data (Server Side)
    let settingsRes: any = { data: null };
    let projectsRes: any = { data: [] };
    let opportunitiesRes: any = { data: [] };
    let tasksRes: any = { data: [] };
    let dollarRate = { value: 855 }; // Safe default

    if (orgId) {
        try {
            const results = await Promise.all([
                supabase.from('Settings').select('*').eq('organizationId', orgId).maybeSingle(),
                supabase.from('Project')
                    .select(`
                        *,
                        company:Company(id, name, contactName, phone, email),
                        costEntries:CostEntry(id, amountNet, date, description),
                        invoices:Invoice(id, amountInvoicedGross, amountPaidGross, sent, sentDate, dueDate, paymentTermsDays),
                        quoteItems:QuoteItem(id, priceNet, costNet, quantity, isSelected)
                    `)
                    .eq('organizationId', orgId)
                    .order('updatedAt', { ascending: false }),
                supabase.from('Opportunity').select('*').eq('organizationId', orgId),
                supabase.from('Task')
                    .select('*, project:Project(id, name, company:Company(name))')
                    .eq('organizationId', orgId)
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
        }
    }

    const settings = settingsRes.data || { vatRate: DEFAULT_VAT_RATE } as Settings;
    const projects = projectsRes.data || [];
    const opportunities = opportunitiesRes.data || [];

    // 2. Trigger Sentinel Analysis (Proactive Layer)
    let sentinelAlerts: any[] = [];
    if (orgId) {
        try {
            await Promise.all([
                SentinelService.runAnalysis(orgId, isSentinelForce),
                SentinelService.updateOrgStats(orgId),
                import("@/services/activation-service").then(({ ActivationService }) =>
                    ActivationService.trackFirst('ORG_CREATED', orgId)
                )
            ]);
            const { data } = await SentinelService.getActiveAlerts(orgId);
            sentinelAlerts = data || [];
        } catch (error) {
            console.error("[Dashboard] Sentinel analysis failed:", error);
        }
    }

    // 3. Calculate Dashboard Data
    const kpis = orgId
        ? DashboardService.getGlobalKPIs(projects, opportunities, period, settings, dollarRate.value)
        : { totalRevenue: 0, activeProjects: 0, pendingQuotes: 0, conversionRate: 0, periodRevenue: 0, revenueGrowth: 0 };

    const chartData = orgId ? DashboardService.getFinancialTrends(projects as any, period) : [];
    const topClients = orgId ? DashboardService.getTopClients(projects as any) : [];

    // 4. Fetch Stats & Sub Status for Onboarding (if org exists)
    let orgStats = null;
    let subscription = null;
    let org = null;

    if (orgId) {
        [orgStats, subscription, org] = await Promise.all([
            prisma.organizationStats.findUnique({ where: { organizationId: orgId } }),
            prisma.subscription.findUnique({ where: { organizationId: orgId }, select: { status: true } }),
            prisma.organization.findUnique({ where: { id: orgId }, select: { mode: true } })
        ]);
    }

    const isTrialing = subscription?.status === 'TRIALING';
    const orgMode = (org?.mode as 'SOLO' | 'TEAM') || 'SOLO';

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
    const billingAlerts = deadlines.filter(a => a.type === 'INVOICE');

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10 max-w-7xl mx-auto">
            {!orgId && !isExplore ? (
                <WorkspaceSetupBanner />
            ) : (
                workspace.isAutoProvisioned && (
                    <div className="bg-blue-600 rounded-xl p-6 text-white shadow-lg space-y-4 animate-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-xl font-bold">¡Bienvenido a TechProyect!</h3>
                        </div>
                        <p className="text-blue-50 opacity-90 max-w-2xl">
                            Hemos creado un espacio de trabajo inicial llamado "Mi Organización" para que puedas empezar de inmediato. Puedes cambiarle el nombre en la configuración en cualquier momento.
                        </p>
                    </div>
                )
            )}

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
                    {orgId ? (
                        <Link href="/projects/new">
                            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 whitespace-nowrap flex items-center">
                                <span className="mr-1 text-lg leading-none">+</span> Nuevo Proyecto
                            </button>
                        </Link>
                    ) : (
                        <button
                            disabled
                            className="bg-zinc-400 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed opacity-50 flex items-center"
                        >
                            <span className="mr-1 text-lg leading-none">+</span> Nuevo Proyecto
                        </button>
                    )}
                </div>
            </div>

            {/* Activation Checklist (Only if org exists) */}
            {orgId && <ActivationChecklist stats={orgStats} orgMode={orgMode} />}

            {/* 1. KPIs Section */}
            <DashboardKPIs data={kpis as any} />

            {/* 2. Proactive Layer */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <NextBestAction action={nextBestAction as any} />
                </div>
                <div className="hidden lg:block lg:col-span-1">
                    <div className="bg-zinc-900 rounded-xl p-6 text-white h-full flex flex-col justify-center">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Estado General</h4>
                        <div className="text-3xl font-bold">{orgId ? 'Saludable' : 'Configura tu Espacio'}</div>
                        <p className="text-[10px] text-zinc-500 mt-2">
                            {orgId ? 'Sentinel monitorizando 5 parámetros críticos.' : 'Crea una organización para activar Sentinel.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div className="lg:col-span-2 space-y-6 flex flex-col">
                    <div className="bg-card rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
                        <div className="mb-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">Tendencias Financieras</h3>
                                <p className="text-sm text-muted-foreground">Ingresos vs Costos ({periodLabels[period] || period})</p>
                            </div>
                        </div>
                        {orgId ? <RevenueChart data={chartData} /> : <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg opacity-40">Modo Exploración - Sin datos financieros</div>}
                    </div>

                    <div className="flex-1">
                        <TasksWidget tasks={sortedActions.slice(0, 15) as any} />
                    </div>
                </div>

                <div className="space-y-6 flex flex-col">
                    <SentinelAlertsPanel alerts={sentinelAlerts as any || []} />
                    <InventoryAlertsWidget />
                    <BillingAlertsWidget alerts={billingAlerts} />
                    <ClientRankingWidget clients={topClients} />
                </div>
            </div>

            {/* 4. Gantt Chart Section */}
            <div className="mt-6">
                <div className="bg-card rounded-xl border border-border shadow-sm p-1 hover:shadow-md transition-shadow duration-300">
                    <ProjectGantt projects={projects as any} />
                </div>
            </div>

            {/* Debug Panel (Superadmin Only) */}
            {isSuperadmin && isDebugWorkspace && (
                <div className="mt-12 p-6 bg-zinc-100 dark:bg-zinc-800 rounded-xl border-2 border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Superadmin Debug Console</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                        <div className="space-y-1">
                            <span className="text-zinc-400">Workspace Status:</span>
                            <div className="font-bold">{orgId ? 'CONNECTED' : 'STANDALONE'}</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-zinc-400">Active Org:</span>
                            <div className="truncate font-bold" title={orgId || 'None'}>{orgId || 'None'}</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-zinc-400">Total Orgs:</span>
                            <div className="font-bold">{workspace.organizationsCount}</div>
                        </div>
                        <div className="space-y-1 flex items-end">
                            <Link href="/api/_debug/workspace" className="text-primary hover:underline">Full Diagnostic API →</Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
