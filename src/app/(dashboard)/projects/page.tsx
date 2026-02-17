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
import { ProjectTable } from "@/components/projects/ProjectTable";

type Settings = Database['public']['Tables']['Settings']['Row']

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ page?: string, tab?: string }> }) {
    const supabase = await createClient();
    const resolvedParams = await searchParams;

    const page = Number(resolvedParams?.page) || 1;
    const itemsPerPage = 10;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage - 1;

    const tab = resolvedParams?.tab || 'active';

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
        query = query.in('status', ['CERRADO', 'CANCELADO']);
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
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Proyectos</h2>
                    <p className="text-muted-foreground mt-1">Gestiona tus cotizaciones y proyectos.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-muted p-1 rounded-lg flex text-sm font-medium">
                        <Link
                            href="/projects?tab=active"
                            className={`px-4 py-2 rounded-lg transition-all font-semibold ${tab === 'active'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                        >
                            En Curso
                        </Link>
                        <Link
                            href="/projects?tab=history"
                            className={`px-4 py-2 rounded-lg transition-all font-semibold ${tab === 'history'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
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
                <ProjectTable projects={projects as any} settings={settings!} />

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


