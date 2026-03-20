import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { QrCode, Building2, Shield, TrendingUp, Loader2 } from "lucide-react";
import { DashboardService } from "@/services/dashboardService";
import { CurrencyService } from "@/services/currencyService";
import { COMMERCIAL_CONFIG } from "@/config/commercial";
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
import { OperatingContextBanner } from "@/components/layout/OperatingContextBanner";
import prisma from "@/lib/prisma";
import { redirect, unstable_rethrow } from "next/navigation";
import { generateId } from "@/lib/id";

export const dynamic = 'force-dynamic';

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
    const traceId = generateId('DSH');
    const params = await searchParams;
    const period = params?.period || '30d';
    const isSentinelForce = params?.sentinel_force === 'true';
    const isExplore = params?.explore === 'true';
    const supabase = await createClient();
    const startTime = Date.now();

    // 0. Resolve Workspace State (Node Runtime)
    let workspace;
    try {
        const { getWorkspaceState } = await import('@/lib/auth/workspace-resolver');
        workspace = await getWorkspaceState();
    } catch (e: any) {
        unstable_rethrow(e);

        const msg = e instanceof Error ? e.message : String(e);
        console.error("[Dashboard] FATAL: Workspace Resolution failed:", msg);
        throw e; // Let error.tsx handle the boundary
    }

    // 0.5 Canonical Redirect Guard (v1.2)
    const { resolveRedirect } = await import('@/lib/auth/redirect-resolver');
    const redirectPath = resolveRedirect({
        pathname: '/dashboard',
        isAuthed: workspace.status !== 'NOT_AUTHENTICATED',
        hasOrgContext: !!workspace.activeOrgId,
        recommendedRoute: workspace.recommendedRoute
    });

    if (redirectPath && redirectPath !== '/dashboard') {
        console.log(`[DashboardGuard] Redirecting to: ${redirectPath}`);
        redirect(redirectPath);
    }

    const orgId = workspace.activeOrgId;
    const isSuperadmin = workspace.userRole === 'SUPERADMIN';

    const isDebugWorkspace = process.env.DEBUG_WORKSPACE === '1';

    // Fetch user for bootstrap check - Defensive
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    console.log(`[Dashboard] Context: User=${user?.email || 'unknown'}, Role=${workspace.userRole}, Org=${orgId || 'none'}, Status=${workspace.status}`);

    let orgData: { mode: string; name: string } | null = null;
    if (orgId) {
        try {
            orgData = await prisma.organization.findUnique({ where: { id: orgId }, select: { mode: true, name: true } });
        } catch (e) {
            console.error("[Dashboard] Org fetch failed:", e);
        }
    }

    console.log(JSON.stringify({
        event: "OBSERVABILITY",
        traceId,
        route: "/dashboard",
        user: orgId,
        durationMs: Date.now() - startTime,
        sourceOfTruth: "DB/Prisma",
        result: "SUCCESS",
        fallbackReason: null
    }));

    return (
        <div className={`space-y-8 animate-in fade-in duration-500 pb-10 max-w-7xl mx-auto relative ${isSuperadmin && orgId ? 'pt-12' : ''}`}>
            {isSuperadmin && orgId && orgData?.name && (
                <div className="fixed top-0 left-0 right-0 z-[100] md:left-64 print:hidden">
                    <OperatingContextBanner 
                        orgName={orgData.name} 
                        isSuperadmin={true} 
                    />
                </div>
            )}

            {isSuperadmin && !orgId && !isExplore && (
                <div className="bg-blue-600 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 mb-6 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Panel de Control Global</h3>
                            <p className="text-blue-100 text-sm">Gestiona organizaciones, licencias comp y aprobaciones comerciales.</p>
                        </div>
                    </div>
                    <Link href="/admin/orgs" className="bg-white text-blue-700 hover:bg-blue-50 px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all whitespace-nowrap">
                        Ir al Portal Admin
                    </Link>
                </div>
            )}

            {workspace.status === 'WORKSPACE_ERROR' && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-6 text-center shadow-sm animate-in slide-in-from-top-4 mb-6">
                    <h2 className="text-xl font-bold text-orange-900 dark:text-orange-400 mb-2">Conexión interrumpida</h2>
                    <p className="text-orange-700 dark:text-orange-300 mb-4">{workspace.error || 'No pudimos cargar tu entorno de trabajo en el tiempo esperado. Por favor, intenta de nuevo.'}</p>
                    <button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all inline-block" onClick={() => window.location.reload()}>
                        Reintentar conexión
                    </button>
                </div>
            )}

            {workspace.status === 'PROFILE_MISSING' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center shadow-sm animate-in zoom-in duration-300 mb-6" data-testid="profile-incomplete-alert">
                    <h2 className="text-xl font-bold text-red-700 dark:text-red-500 mb-2">Sincronización de perfil pendiente</h2>
                    <p className="text-red-900/80 dark:text-red-400/80 mb-4 max-w-xl mx-auto italic font-medium">
                        Tu sesión de autenticación es correcta, pero estamos terminando de configurar tu perfil de aplicación. 
                        Si este mensaje persiste tras recargar, por favor ejecuta el diagnóstico.
                    </p>
                    <div className="flex justify-center gap-4">
                        <button className="bg-white hover:bg-slate-50 text-red-700 border border-red-200 px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all" onClick={() => window.location.reload()}>
                            Recargar página
                        </button>
                        <Link 
                            href="/api/debug/workspace-doctor" 
                            data-testid="workspace-doctor-cta"
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all inline-block"
                        >
                            Ejecutar autodiagnóstico
                        </Link>
                    </div>
                </div>
            )}

            {workspace.status === 'NO_ORG' && !isExplore && !isSuperadmin && (
                <WorkspaceSetupBanner />
            )}

            {workspace.status === 'NO_ORG' && !isExplore && isSuperadmin && (
                <div className="bg-blue-900/5 dark:bg-blue-900/10 border border-blue-500/20 rounded-xl p-8 text-center shadow-lg animate-in zoom-in duration-300 mb-6">
                    <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4">
                        <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300 mb-2">Modo Administrador Global Activo</h2>
                    <p className="text-blue-900/70 dark:text-blue-400/80 mb-6 max-w-lg mx-auto">
                        Tienes acceso global al sistema. Actualmente no tienes ninguna organización seleccionada para operar. Puedes ir al panel general o entrar a tu área local.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link href="/admin/orgs" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-bold shadow-md transition-all">
                            Panel Global de Organizaciones
                        </Link>
                        <Link href="/org/select" className="bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 px-6 py-3 rounded-lg text-sm font-bold shadow-sm transition-all">
                            Seleccionar o Crear Organización Local
                        </Link>
                    </div>
                </div>
            )}

            {workspace.status === 'ORG_MULTI_NO_SELECTION' && !isExplore && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-8 text-center shadow-md animate-in zoom-in duration-300 mb-6">
                    <h2 className="text-2xl font-bold text-amber-700 dark:text-amber-500 mb-2">Sesión de trabajo no especificada</h2>
                    <p className="text-amber-900/80 dark:text-amber-400/80 mb-6 max-w-xl mx-auto">
                        Tus permisos globales están intactos, pero no has seleccionado ninguna organización para operar en esta sesión de dashboard.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        {isSuperadmin && (
                            <Link href="/admin/orgs" className="bg-white hover:bg-slate-50 text-amber-700 border border-amber-200 px-6 py-3 rounded-lg text-sm font-bold shadow-sm transition-all">
                                Panel Global
                            </Link>
                        )}
                        <Link href="/org/select" className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg text-sm font-bold shadow-md transition-all inline-block">
                            Seleccionar organización para operar
                        </Link>
                    </div>
                </div>
            )}

            {workspace.status === 'ORG_PENDING_APPROVAL' && !isExplore && (
                <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-6 text-center shadow-sm animate-in zoom-in duration-300 mb-6">
                    <h2 className="text-xl font-bold text-blue-800 dark:text-blue-400 mb-2">Cuenta en evaluación comercial</h2>
                    <p className="text-blue-900/80 dark:text-blue-300/80 mb-4 max-w-xl mx-auto">
                        Hemos recibido la solicitud para tu espacio de trabajo y nuestro equipo comercial la está evaluando. Te notificaremos pronto en cuanto tu entorno sea activado.
                    </p>
                </div>
            )}

            {isExplore && workspace.status !== 'ORG_ACTIVE_SELECTED' && (
                <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between shadow-sm animate-in slide-in-from-top-4 gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-lg">
                            <Building2 className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-blue-900 dark:text-blue-400">Modo Exploración</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">Estás viendo datos de demostración. Crea un espacio de trabajo real para gestionar tu información.</p>
                        </div>
                    </div>
                    <Link href="/start" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all whitespace-nowrap">
                        Crear Organización
                    </Link>
                </div>
            )}

            {workspace.status === 'ORG_ACTIVE_SELECTED' && workspace.isAutoProvisioned && (
                <div className="bg-blue-600 rounded-xl p-6 text-white shadow-lg space-y-4 animate-in slide-in-from-top-4 duration-500 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-bold">¡Bienvenido a TechProyect!</h3>
                    </div>
                    <p className="text-blue-50 opacity-90 max-w-2xl">
                        Hemos creado un espacio de trabajo inicial llamado &quot;Mi Organización&quot; de forma automática.
                    </p>
                </div>
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

            {/* Main Content Area - Suspensed for Performance */}
            {(workspace.status === 'ORG_ACTIVE_SELECTED' || isExplore) && (
                <Suspense fallback={
                    <div className="space-y-8 animate-pulse pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />)}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-3 h-[400px] bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                            <div className="lg:col-span-1 h-[400px] bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                        </div>
                        <div className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                    </div>
                }>
                    <DashboardContent orgId={orgId} period={period} isSentinelForce={isSentinelForce} isExplore={isExplore} traceId={traceId} />
                </Suspense>
            )}

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
                            <Link href="/api/debug/workspace" className="text-primary hover:underline">Full Diagnostic API →</Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Internal Server Component for fetching heavy Dashboard Data without blocking the initial render
async function DashboardContent({ orgId, period, isSentinelForce, isExplore, traceId }: { orgId: string | null, period: string, isSentinelForce: boolean, isExplore: boolean, traceId: string }) {
    let settings = {
        vatRate: COMMERCIAL_CONFIG.DEFAULT_VAT_RATE,
        yellowThresholdDays: COMMERCIAL_CONFIG.YELLOW_THRESHOLD_DAYS,
        defaultPaymentTermsDays: COMMERCIAL_CONFIG.DEFAULT_PAYMENT_TERMS_DAYS,
        currency: COMMERCIAL_CONFIG.BASE_CURRENCY
    };
    let projects: any[] = [];
    let opportunities: any[] = [];
    let dollarRate = { value: 855 };
    let tasks: any[] = [];
    let orgStats: any = null;
    let subscription: { status: string } | null = null;
    let activationData: any = null;
    let realProjectsCount = 0;

    if (orgId) {
        try {
            const results = await Promise.all([
                prisma.settings.findFirst(),
                prisma.project.findMany({
                    where: { organizationId: orgId },
                    include: {
                        company: { select: { id: true, name: true, contactName: true, phone: true, email: true } },
                        costEntries: { select: { id: true, amountNet: true, date: true, description: true } },
                        invoices: { select: { id: true, amountInvoicedGross: true, amountPaidGross: true, sent: true, sentDate: true, dueDate: true, paymentTermsDays: true } },
                        quoteItems: { select: { id: true, priceNet: true, costNet: true, quantity: true, isSelected: true } }
                    },
                    orderBy: { updatedAt: 'desc' }
                }),
                prisma.opportunity.findMany({ where: { organizationId: orgId } }),
                CurrencyService.getDollarRate().catch(() => ({ value: 855 })),
                prisma.task.findMany({
                    where: { organizationId: orgId, status: 'PENDING' },
                    include: { project: { select: { id: true, name: true, company: { select: { name: true } } } } },
                    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
                    take: 20
                }),
                prisma.organizationStats.findUnique({ where: { organizationId: orgId } }),
                prisma.subscription.findUnique({ where: { organizationId: orgId }, select: { status: true } }),
                import("@/services/activation-service").then(({ ActivationService }) => 
                    ActivationService.getActivationChecklist(orgId)
                ),
                prisma.project.count({ where: { organizationId: orgId } })
            ]);

            if (results[0]) settings = results[0] as any;
            projects = (results[1] || []) as any[];
            opportunities = (results[2] || []) as any[];
            dollarRate = results[3];
            tasks = (results[4] || []) as any[];
            orgStats = results[5];
            subscription = results[6];
            activationData = results[7];
            realProjectsCount = results[8];

        } catch (error: unknown) {
            console.error("[DashboardContent] Critical Core fetch error:", error);
        }
    }

    if (orgId && realProjectsCount === 0 && !isExplore) {
        return (
            <>
                {!!activationData && <ActivationChecklist data={JSON.parse(JSON.stringify(activationData))} />}
                <div className="bg-white dark:bg-zinc-900 border border-border rounded-xl p-12 text-center shadow-sm animate-in fade-in max-w-3xl mx-auto mt-12">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <QrCode className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-3">Tu sistema está listo para operar</h3>
                    <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                        Comienza a estructurar tus operaciones creando tu primer proyecto o registrando un cliente en la base de datos. Los indicadores financieros se activarán automáticamente una vez que tengas flujo de datos.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link href="/projects/new" className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-medium transition-all shadow-md">
                            Crear primer proyecto
                        </Link>
                        <Link href="/clients" className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground px-6 py-3 rounded-lg font-medium transition-all border border-border">
                            Registrar clientes
                        </Link>
                    </div>
                </div>
            </>
        );
    }

    // 1. Calculate Financial KPIs using the Unified Domain (OLA B)
    const { FinancialDomain } = await import("@/services/financialDomain");
    const domainMetrics = (orgId && !isExplore) 
        ? FinancialDomain.aggregateCollection(projects, settings as any)
        : null;

    const kpis = (domainMetrics) 
        ? {
            billing: { value: domainMetrics.totalRevenue, previous: 0, trend: 0 },
            margin: { value: domainMetrics.totalMargin, previous: 0, trend: 0 },
            earnedMargin: domainMetrics.avgMarginPct / 100,
            projectedMargin: domainMetrics.avgMarginPct / 100,
            pipeline: { value: 0, count: 0 }
        }
        : isExplore ? {
            billing: { value: 7500000, previous: 5000000, trend: 50 },
            margin: { value: 3200000, previous: 2800000, trend: 14.2 },
            earnedMargin: 0.42,
            projectedMargin: 0.45,
            pipeline: { value: 12000000, count: 5 }
        } : {
            billing: { value: 0, previous: 0, trend: 0 },
            margin: { value: 0, previous: 0, trend: 0 },
            earnedMargin: 0,
            projectedMargin: 0,
            pipeline: { value: 0, count: 0 }
        };

    // 2. Supplement with legacy trends and pipeline logic
    if (orgId && !isExplore) {
        const legacy = DashboardService.getGlobalKPIs(projects, opportunities, period, settings, dollarRate.value);
        kpis.pipeline = legacy.pipeline;
        kpis.billing.previous = legacy.billing.previous;
        kpis.billing.trend = legacy.billing.trend;
        kpis.margin.previous = legacy.margin.previous;
        kpis.margin.trend = legacy.margin.trend;
    }

    const chartData = (orgId && !isExplore) ? DashboardService.getFinancialTrends(projects, period) : [];
    const topClients = (orgId && !isExplore) ? DashboardService.getTopClients(projects) : [];
    const isTrialing = subscription?.status === 'TRIALING';

    const deadlines = (orgId && !isExplore) ? DashboardService.getUpcomingDeadlines(projects, settings as any) : [];
    const billingAlerts = deadlines.filter(a => a.type === 'INVOICE');

    // Serialization for Client Components
    const sanitizedProjects = JSON.parse(JSON.stringify(projects));
    const sanitizedTasks = JSON.parse(JSON.stringify(tasks));
    const sanitizedChartData = JSON.parse(JSON.stringify(chartData));
    const sanitizedTopClients = JSON.parse(JSON.stringify(topClients));
    const sanitizedBillingAlerts = JSON.parse(JSON.stringify(billingAlerts));
    const sanitizedKPIs = JSON.parse(JSON.stringify(kpis));

    return (
        <div className="animate-in fade-in duration-500">
            {!!orgId && realProjectsCount > 0 && !!activationData && !isExplore && (
                <ActivationChecklist data={JSON.parse(JSON.stringify(activationData))} />
            )}

            <DashboardKPIs data={sanitizedKPIs} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch mt-8">
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-card rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
                        <div className="mb-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2 uppercase tracking-tighter italic">
                                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                                    Revenue Pulse
                                </h3>
                                <p className="text-xs text-muted-foreground">Evolución comercial ({periodLabels[period] || period})</p>
                            </div>
                        </div>
                        {orgId ? <RevenueChart data={sanitizedChartData} /> : <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg opacity-40">Modo Exploración - Sin datos financieros</div>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Dynamic Action Center (Calculated on the fly) */}
                        <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-xl" />}>
                            <DeferredActionCenter 
                                projects={sanitizedProjects} 
                                settings={JSON.parse(JSON.stringify(settings))} 
                                opportunities={JSON.parse(JSON.stringify(opportunities))} 
                                tasks={sanitizedTasks} 
                                orgStats={JSON.parse(JSON.stringify(orgStats))} 
                                isTrialing={isTrialing} 
                                orgId={orgId} 
                                isSentinelForce={isSentinelForce}
                            />
                        </Suspense>
                        <div className="space-y-6">
                            <div className="bg-zinc-900 rounded-xl p-5 text-white shadow-lg border border-zinc-800">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Salud del Sistema</h4>
                                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black italic uppercase">{orgId ? 'Saludable' : 'Inactivo'}</span>
                                </div>
                                <p className="text-[9px] text-zinc-500 mt-2 font-medium leading-relaxed">
                                    Sentinel monitorizando parámetros críticos de integridad y rendimiento.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <Suspense fallback={<div className="h-48 bg-muted animate-pulse rounded-xl" />}>
                        <DeferredSentinelPanel orgId={orgId} isSentinelForce={isSentinelForce} />
                    </Suspense>
                    <InventoryAlertsWidget />
                    <BillingAlertsWidget alerts={sanitizedBillingAlerts} />
                    <ClientRankingWidget clients={sanitizedTopClients} />
                </div>
            </div>

            <div className="mt-6 bg-card rounded-xl border border-border shadow-sm p-1 hover:shadow-md transition-shadow duration-300">
                <ProjectGantt projects={sanitizedProjects} />
            </div>
        </div>
    );
}

// Deferred components to enable streaming
async function DeferredSentinelPanel({ orgId, isSentinelForce }: { orgId: string | null, isSentinelForce: boolean }) {
    if (!orgId) return null;
    
    try {
        // Sentinel fetch concurrently but separately from DB
        await Promise.all([
            SentinelService.runAnalysis(orgId, isSentinelForce),
            SentinelService.updateOrgStats(orgId)
        ]);

        const { data } = await SentinelService.getActiveAlerts(orgId);
        return <SentinelAlertsPanel alerts={JSON.parse(JSON.stringify(data || []))} />;
    } catch (e) {
        console.error("[DeferredSentinelPanel] Error:", e);
        return null;
    }
}

async function DeferredActionCenter({ projects, settings, opportunities, tasks, orgStats, isTrialing, orgId, isSentinelForce }: any) {
    let sentinelAlerts: any[] = [];
    if (orgId) {
        try {
            const { data } = await SentinelService.getActiveAlerts(orgId);
            sentinelAlerts = data || [];
        } catch (e) {
            console.error("[DeferredActionCenter] Sentinel alerts fetch failed", e);
        }
    }

    const centerData = DashboardService.getActionCenterData(
        projects,
        settings,
        opportunities,
        tasks,
        sentinelAlerts,
        orgStats,
        isTrialing
    );

    // Serialization for Client Components
    const sanitizedActions = JSON.parse(JSON.stringify(centerData.actions.slice(0, 10)));
    const sanitizedNextAction = JSON.parse(JSON.stringify(centerData.nextBestAction));

    return (
        <>
            <TasksWidget tasks={sanitizedActions} />
            <NextBestAction action={sanitizedNextAction} />
        </>
    );
}
