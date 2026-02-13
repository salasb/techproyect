import Link from "next/link";
import { Plus, AlertTriangle, Lock, Clock, Info, DollarSign, Timer, ChevronRight, Send, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { calculateProjectFinancials } from "@/services/financialCalculator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { differenceInCalendarDays, isBefore, startOfDay, format } from "date-fns";
import { DEFAULT_VAT_RATE } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PaginationControl } from "@/components/ui/PaginationControl";
import { RiskEngine } from "@/services/riskEngine";
import { RiskBadge } from "@/components/projects/RiskBadge";

type Settings = Database['public']['Tables']['Settings']['Row']

export default async function ProjectsPage({ searchParams }: { searchParams: { page?: string, tab?: string } }) {
    const supabase = await createClient();

    const page = Number(searchParams?.page) || 1;
    const itemsPerPage = 10;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage - 1;

    const tab = searchParams?.tab || 'active';

    // 1. Fetch settings for VAT and thresholds
    let { data: settings } = await supabase.from('Settings').select('*').single();
    if (!settings) {
        // Fallback default if not found
        settings = { vatRate: DEFAULT_VAT_RATE } as Settings;
    }

    // 2. Fetch projects with filtering based on tab
    let query = supabase
        .from('Project')
        .select(`
            *,
            company:Company(*),
            costEntries:CostEntry(*),
            invoices:Invoice(*),
            quoteItems:QuoteItem(*)
        `, { count: 'exact' });

    if (tab === 'active') {
        query = query.in('status', ['EN_ESPERA', 'EN_CURSO', 'BLOQUEADO']);
    } else if (tab === 'history') {
        query = query.in('status', ['FINALIZADO', 'CANCELADO']);
    }

    const { data: projectsData, error, count } = await query
        .order('createdAt', { ascending: false })
        .range(start, end);

    if (error) {
        console.error("Error fetching projects:", error);
        return <div className="p-8 text-center text-red-500">Error cargando proyectos: {error.message}</div>
    }

    const projects = projectsData || [];
    const totalPages = count ? Math.ceil(count / itemsPerPage) : 0;
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Proyectos</h2>
                    <p className="text-muted-foreground mt-1">Gestiona tus cotizaciones y proyectos.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-muted p-1 rounded-lg flex text-sm font-medium">
                        <Link
                            href="/projects?tab=active"
                            className={`px-3 py-1.5 rounded-md transition-all ${tab === 'active' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            En Curso
                        </Link>
                        <Link
                            href="/projects?tab=history"
                            className={`px-3 py-1.5 rounded-md transition-all ${tab === 'history' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Historial
                        </Link>
                    </div>
                    <Link href="/projects/new">
                        <button className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
                            <Plus className="w-4 h-4 mr-2" />
                            <span className="hidden md:inline">Nuevo Proyecto</span>
                            <span className="md:hidden">Nuevo</span>
                        </button>
                    </Link>
                </div>
            </div>

            <div className="bg-transparent md:bg-card md:rounded-xl md:border md:border-border md:shadow-sm overflow-hidden">
                {/* Desktop View (Table) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-700 dark:text-slate-200 uppercase bg-slate-100 dark:bg-slate-800/80 border-b border-zinc-200 dark:border-zinc-700 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 font-medium">Proyecto / Cliente</th>
                                <th className="px-6 py-3 font-medium">Estado</th>
                                <th className="px-6 py-3 font-medium">Próxima Acción</th>
                                <th className="px-6 py-3 font-medium">Salud</th>
                                <th className="px-6 py-3 font-medium">Finanzas (Estimado)</th>

                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {projects.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                                        No hay proyectos registrados. Crea el primero para comenzar.
                                    </td>
                                </tr>
                            ) : (
                                projects.map((project) => {
                                    // Calculate financials on the fly
                                    const fin = calculateProjectFinancials(
                                        project,
                                        project.costEntries || [],
                                        project.invoices || [],
                                        settings!,
                                        project.quoteItems || []
                                    );

                                    // Risk Analysis
                                    const risk = RiskEngine.calculateProjectRisk(project as any, settings!);

                                    // Alert Logic
                                    const today = new Date();
                                    const nextActionDate = project.nextActionDate ? new Date(project.nextActionDate) : null;
                                    const isOverdue = nextActionDate && isBefore(startOfDay(nextActionDate), startOfDay(today));
                                    const isDueToday = nextActionDate && differenceInCalendarDays(nextActionDate, today) === 0;

                                    // Currency Helper
                                    const currency = project.currency || 'CLP';
                                    const formatCurrency = (amount: number) => {
                                        if (currency === 'CLP') return 'CLP $' + amount.toLocaleString('es-CL', { maximumFractionDigits: 0 });
                                        if (currency === 'USD') return 'USD $' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                                        if (currency === 'UF') return 'UF ' + amount.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                        return 'CLP $' + amount.toLocaleString('es-CL', { maximumFractionDigits: 0 });
                                    };

                                    return (
                                        <tr key={project.id} className="group border-b border-border border-l-[3px] border-l-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all hover:shadow-sm hover:border-l-blue-500 relative">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`/projects/${project.id}`}
                                                            className="font-medium text-foreground group-hover:text-blue-600 transition-colors flex items-center gap-2"
                                                        >
                                                            {project.name}
                                                            <ChevronRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300 text-blue-600" />
                                                        </Link>
                                                        {risk.level !== 'LOW' && (
                                                            <RiskBadge level={risk.level} score={risk.score} className="scale-75 origin-left" />
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">{project.company.name}</span>
                                                </div>

                                                {project.blockingReason && (
                                                    <div className="mt-2 flex items-center text-[10px] font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full w-fit">
                                                        <Lock className="w-3 h-3 mr-1" />
                                                        {project.blockingReason}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={project.status} type="PROJECT" />
                                            </td>
                                            <td className="px-6 py-4">
                                                {project.nextAction ? (
                                                    <div className={`flex items-start space-x-2 text-xs ${isOverdue ? 'text-destructive font-semibold' : isDueToday ? 'text-yellow-600 font-semibold' : 'text-muted-foreground'}`}>
                                                        {isOverdue && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                                                        {!isOverdue && isDueToday && <Clock className="w-4 h-4 flex-shrink-0" />}
                                                        <div className="flex flex-col">
                                                            <span>{project.nextAction}</span>
                                                            {nextActionDate && <span className="opacity-75 capitalize">{nextActionDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                                                        </div>
                                                    </div>
                                                ) : <span className="text-muted-foreground text-xs">-</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {/* Health Indicators (Business Milestones) */}
                                                <div className="flex items-center gap-3">
                                                    {/* Quote Sent Indicator */}
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className={`p-1.5 rounded-full transition-all ${project.quoteSentDate
                                                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                                                                    : 'bg-zinc-100/50 text-zinc-300 dark:bg-zinc-800/30 dark:text-zinc-700'
                                                                    }`}>
                                                                    <Send className="w-4 h-4" />
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">
                                                                <p className="font-semibold mb-1">Cotización Enviada</p>
                                                                <p className="text-xs">
                                                                    {project.quoteSentDate
                                                                        ? `Enviada el ${format(new Date(project.quoteSentDate), "dd/MM/yyyy")}`
                                                                        : 'Aún no enviada'}
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    {/* Digital Acceptance Indicator */}
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className={`p-1.5 rounded-full transition-all ${project.acceptedAt
                                                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                                                                    : 'bg-zinc-100/50 text-zinc-300 dark:bg-zinc-800/30 dark:text-zinc-700'
                                                                    }`}>
                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">
                                                                <p className="font-semibold mb-1">Aceptación Digital</p>
                                                                <p className="text-xs">
                                                                    {project.acceptedAt
                                                                        ? `Aceptado el ${format(new Date(project.acceptedAt), "dd/MM/yyyy")}`
                                                                        : 'Pendiente de aceptación'}
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col text-sm">
                                                    <span className="font-bold text-foreground">
                                                        {formatCurrency(fin.priceGross)} <span className="text-xs text-muted-foreground font-normal ml-1">Total</span>
                                                    </span>

                                                    {/* Margin Display */}
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">Margen:</span>
                                                        <span className={`text-xs font-bold ${fin.trafficLightFinancial === 'RED' ? 'text-red-600' :
                                                            fin.trafficLightFinancial === 'YELLOW' ? 'text-yellow-600' :
                                                                fin.trafficLightFinancial === 'GREEN' ? 'text-green-600' :
                                                                    'text-zinc-500'
                                                            }`}>
                                                            {formatCurrency(fin.marginAmountNet)}
                                                        </span>

                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${fin.trafficLightFinancial === 'RED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                            fin.trafficLightFinancial === 'YELLOW' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                fin.trafficLightFinancial === 'GREEN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                                    'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                                                            }`}>
                                                            {fin.priceNet > 0 ? ((fin.marginAmountNet / fin.priceNet) * 100).toFixed(0) : 0}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View (Cards) */}
                <div className="md:hidden space-y-4">
                    {projects.length === 0 ? (
                        <div className="p-6 text-center text-zinc-500 bg-card rounded-lg border border-border">
                            No hay proyectos registrados.
                        </div>
                    ) : (
                        projects.map((project) => {
                            // Calculate financials on the fly
                            const fin = calculateProjectFinancials(
                                project,
                                project.costEntries || [],
                                project.invoices || [],
                                settings!,
                                project.quoteItems || []
                            );

                            const today = new Date();
                            const nextActionDate = project.nextActionDate ? new Date(project.nextActionDate) : null;
                            const isOverdue = nextActionDate && isBefore(startOfDay(nextActionDate), startOfDay(today));
                            const isDueToday = nextActionDate && differenceInCalendarDays(nextActionDate, today) === 0;

                            const currency = project.currency || 'CLP';
                            const formatCurrency = (amount: number) => {
                                if (currency === 'CLP') return 'CLP $' + amount.toLocaleString('es-CL', { maximumFractionDigits: 0 });
                                // ... other currencies
                                return '$ ' + amount.toLocaleString('es-CL', { maximumFractionDigits: 0 });
                            };

                            // Risk Analysis (Mobile)
                            const risk = RiskEngine.calculateProjectRisk(project as any, settings!);

                            return (
                                <Link
                                    href={`/projects/${project.id}`}
                                    key={project.id}
                                    className="block bg-card rounded-xl border border-border shadow-sm p-4 active:scale-[0.98] transition-all"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="font-semibold text-foreground text-sm">{project.name}</h3>
                                                {risk.level !== 'LOW' && (
                                                    <RiskBadge level={risk.level} score={risk.score} className="scale-75 origin-left" />
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">{project.company.name}</p>
                                        </div>
                                        <StatusBadge status={project.status} type="PROJECT" />
                                    </div>

                                    {/* Financials & Health Row */}
                                    <div className="flex items-center justify-between py-3 border-t border-b border-border/50 mb-3">
                                        <div className="flex items-center gap-4">
                                            {/* Indicators Row */}
                                            <div className="flex items-center gap-2">
                                                <Send className={`w-3.5 h-3.5 ${project.quoteSentDate ? 'text-blue-500' : 'text-zinc-300'}`} />
                                                <CheckCircle2 className={`w-3.5 h-3.5 ${project.acceptedAt ? 'text-emerald-500' : 'text-zinc-300'}`} />
                                            </div>
                                            <div className="h-4 w-px bg-border/50" />
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-2 h-2 rounded-full ${fin.trafficLightFinancial === 'RED' ? 'bg-red-500' :
                                                    fin.trafficLightFinancial === 'YELLOW' ? 'bg-amber-500' :
                                                        fin.trafficLightFinancial === 'GREEN' ? 'bg-emerald-500' : 'bg-zinc-300'
                                                    }`} />
                                                <span className="text-[11px] font-medium text-muted-foreground">{fin.priceNet > 0 ? ((fin.marginAmountNet / fin.priceNet) * 100).toFixed(0) : 0}% Margen</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-sm font-bold text-foreground">{formatCurrency(fin.priceGross)}</span>
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-muted-foreground overflow-hidden">
                                            {isOverdue ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" /> :
                                                isDueToday ? <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" /> :
                                                    <Info className="w-3.5 h-3.5 flex-shrink-0" />}
                                            <span className={`truncate ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                                                {project.nextAction || 'Sin acción pendiente'}
                                            </span>
                                        </div>
                                        {nextActionDate && (
                                            <span className={`flex-shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                                                {nextActionDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>
            {/* Pagination Control */}
            {projects.length > 0 && (
                <PaginationControl
                    currentPage={page}
                    totalPages={totalPages}
                    hasNextPage={hasNextPage}
                    hasPrevPage={hasPrevPage}
                />
            )}
        </div>
    );
}


