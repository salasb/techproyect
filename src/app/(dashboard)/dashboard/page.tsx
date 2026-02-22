import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import Link from "next/link";
import { QrCode, Building2, Shield } from "lucide-react";
import { DashboardService } from "@/services/dashboardService";
import { getDollarRate } from "@/services/currency";
import { DEFAULT_VAT_RATE, DEFAULT_PAYMENT_TERMS_DAYS, YELLOW_THRESHOLD_DAYS, DEFAULT_CURRENCY } from "@/lib/constants";
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

    // Canonical landing for Superadmin without context
    if (isSuperadmin && !orgId && !isExplore) {
        const { redirect } = await import("next/navigation");
        redirect('/admin');
    }

    const isDebugWorkspace = process.env.DEBUG_WORKSPACE === '1';

    const allowlistEntry = process.env.SUPERADMIN_ALLOWLIST || '';
    const allowedEmails = allowlistEntry.split(',').filter(Boolean).map(e => e.trim().toLowerCase());
    const isBootstrapEnabled = process.env.SUPERADMIN_BOOTSTRAP_ENABLED === 'true';

    let isEligibleForBootstrap = false;
    if (!isSuperadmin && workspace.status !== 'NOT_AUTHENTICATED' && isBootstrapEnabled) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email && allowedEmails.includes(user.email.toLowerCase())) {
            isEligibleForBootstrap = true;
        }
    }

    // 1. Fetch Data (Server Side)
    let settingsRes: any = { data: null };
    let projectsRes: any = { data: [] };
    let opportunitiesRes: any = { data: [] };
    let tasksRes: any = { data: [] };
    let dollarRate = { value: 855 }; // Safe default
    let isDataTimeout = false;

    if (orgId && workspace.status === 'ORG_ACTIVE_SELECTED') {
        try {
            const fetchPromises = Promise.all([
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

            const timeoutPromise = new Promise<any[]>((resolve) =>
                setTimeout(() => {
                    isDataTimeout = true;
                    resolve([{ data: null }, { data: [] }, { data: [] }, { data: [] }, { value: 855 }]);
                }, 6000)
            );

            const results = await Promise.race([fetchPromises, timeoutPromise]);

            settingsRes = { data: results[0].data };
            projectsRes = { data: results[1].data };
            opportunitiesRes = { data: results[2].data };
            tasksRes = { data: results[3].data };
            dollarRate = results[4];
        } catch (error) {
            console.error("[Dashboard] Initial data fetch failed:", error);
        }
    }

    const settings = settingsRes.data || {
        vatRate: DEFAULT_VAT_RATE,
        yellowThresholdDays: YELLOW_THRESHOLD_DAYS,
        defaultPaymentTermsDays: DEFAULT_PAYMENT_TERMS_DAYS,
        currency: DEFAULT_CURRENCY
    } as Settings;
    const projects = projectsRes.data || [];
    const opportunities = opportunitiesRes.data || [];

    // 2. Trigger Sentinel Analysis (Proactive Layer)
    let sentinelAlerts: any[] = [];
    if (orgId && workspace.status === 'ORG_ACTIVE_SELECTED' && !isDataTimeout) {
        try {
            const sentinelPromises = Promise.all([
                SentinelService.runAnalysis(orgId, isSentinelForce),
                SentinelService.updateOrgStats(orgId),
                import("@/services/activation-service").then(({ ActivationService }) =>
                    ActivationService.trackFirst('ORG_CREATED', orgId)
                )
            ]);

            // Timeout to prevent hanging dashboard on sentinel logic
            await Promise.race([
                sentinelPromises,
                new Promise((resolve) => setTimeout(resolve, 4000))
            ]);

            // Assuming getActiveAlerts is fast enough
            const { data } = await SentinelService.getActiveAlerts(orgId);
            sentinelAlerts = data || [];
        } catch (error) {
            console.error("[Dashboard] Sentinel analysis failed:", error);
        }
    }

    // 3. Calculate Dashboard Data
    const kpis = (orgId && !isExplore)
        ? DashboardService.getGlobalKPIs(projects, opportunities, period, settings, dollarRate.value)
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

    const chartData = (orgId && !isExplore) ? DashboardService.getFinancialTrends(projects as any, period) :
        isExplore ? [
            { name: 'Ene', label: 'Ene', income: 1200000, cost: 800000, profit: 400000, dateVal: 1 },
            { name: 'Feb', label: 'Feb', income: 1500000, cost: 950000, profit: 550000, dateVal: 2 },
            { name: 'Mar', label: 'Mar', income: 2800000, cost: 1100000, profit: 1700000, dateVal: 3 },
        ] : [];

    const topClients = (orgId && !isExplore) ? DashboardService.getTopClients(projects as any) :
        isExplore ? [
            { name: 'Acme Corp', value: 4500000 },
            { name: 'Global Tech', value: 3000000 }
        ] : [];

    // 4. Fetch Stats & Sub Status for Onboarding (if org exists)
    let orgStats = null;
    let subscription = null;
    let org = null;

    if (orgId && workspace.status === 'ORG_ACTIVE_SELECTED') {
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
        <div className={`space-y-8 animate-in fade-in duration-500 pb-10 max-w-7xl mx-auto relative ${isSuperadmin && orgId ? 'pt-12' : ''}`}>
            {isSuperadmin && orgId && org?.name && (
                <div className="fixed top-0 left-0 right-0 z-[100] md:left-64 print:hidden">
                    <OperatingContextBanner 
                        orgName={org.name} 
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

            {isDataTimeout && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between shadow-sm animate-in slide-in-from-top-4 gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div>
                            <h4 className="font-bold text-orange-900 dark:text-orange-400">Demora en la carga de datos</h4>
                            <p className="text-sm text-orange-700 dark:text-orange-300">Algunos problemas de red interrumpieron la carga completa. Mostrando panel parcial.</p>
                        </div>
                    </div>
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
                        Hemos creado un espacio de trabajo inicial llamado "Mi Organización" de forma automática.
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

            {/* Activation Checklist (Only if org exists) */}
            {orgId && <ActivationChecklist stats={orgStats} orgMode={orgMode} />}

            {/* Main Content Areas */}
            {workspace.status === 'ORG_ACTIVE_SELECTED' && projects.length === 0 && !isExplore ? (
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
            ) : (
                <>
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
                </>
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
