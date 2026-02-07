import Link from "next/link";
import { Plus, AlertTriangle, Lock, Clock, Info, DollarSign, Timer, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { calculateProjectFinancials } from "@/services/financialCalculator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { differenceInCalendarDays, isBefore, startOfDay } from "date-fns";
import { DEFAULT_VAT_RATE } from "@/lib/constants";

type Settings = Database['public']['Tables']['Settings']['Row']

export default async function ProjectsPage() {
    const supabase = await createClient();

    // 1. Fetch settings for VAT and thresholds
    let { data: settings } = await supabase.from('Settings').select('*').single();
    if (!settings) {
        // Fallback default if not found
        settings = { vatRate: DEFAULT_VAT_RATE } as Settings;
    }

    // 2. Fetch projects with all relations needed for calculation
    const { data: projectsData, error } = await supabase
        .from('Project')
        .select(`
            *,
            company:Company(*),
            costEntries:CostEntry(*),
            invoices:Invoice(*),
            quoteItems:QuoteItem(*)
        `)
        .order('updatedAt', { ascending: false });

    if (error) {
        console.error("Error fetching projects:", error);
        return <div className="p-8 text-center text-red-500">Error cargando proyectos: {error.message}</div>
    }

    const projects = projectsData || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Proyectos</h2>
                    <p className="text-muted-foreground mt-1">Gestiona tus cotizaciones y proyectos en curso.</p>
                </div>
                <Link href="/projects/new">
                    <button className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Proyecto
                    </button>
                </Link>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
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

                                    // Alert Logic
                                    const today = new Date();
                                    const nextActionDate = project.nextActionDate ? new Date(project.nextActionDate) : null;
                                    const isOverdue = nextActionDate && isBefore(startOfDay(nextActionDate), startOfDay(today));
                                    const isDueToday = nextActionDate && differenceInCalendarDays(nextActionDate, today) === 0;

                                    // Currency Helper
                                    const currency = project.currency || 'CLP';
                                    const formatCurrency = (amount: number) => {
                                        if (currency === 'CLP') return 'CLP $' + amount.toLocaleString('es-CL', { maximumFractionDigits: 0 });
                                        if (currency === 'USD') return 'USD $' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                        if (currency === 'UF') return 'UF ' + amount.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                        return 'CLP $' + amount.toLocaleString('es-CL', { maximumFractionDigits: 0 });
                                    };

                                    return (
                                        <tr key={project.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col group relative">
                                                    <Link href={`/projects/${project.id}`} className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2">
                                                        {project.name}
                                                        <ChevronRight className="w-4 h-4 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all text-primary" />
                                                    </Link>
                                                    <span className="text-xs text-muted-foreground">{project.company.name}</span>
                                                    {project.blockingReason && (
                                                        <div className="mt-1 flex items-center text-xs text-destructive bg-destructive/10 p-1 rounded max-w-fit">
                                                            <Lock className="w-3 h-3 mr-1" />
                                                            {project.blockingReason}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={project.status} />
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
                                                <div className="flex flex-col gap-2">
                                                    {/* Status Logic */}
                                                    {project.status === 'EN_ESPERA' || project.status === 'BLOQUEADO' ? (
                                                        <div className="flex items-center text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded w-fit">
                                                            <Info className="w-3.5 h-3.5 mr-1.5" />
                                                            <span>{project.status === 'EN_ESPERA' ? 'En Pausa' : 'Bloqueado'}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-1.5">
                                                            {/* Financial Health */}
                                                            <div className="flex items-center gap-2">
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border cursor-help w-fit ${fin.trafficLightFinancial === 'RED' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300' :
                                                                                fin.trafficLightFinancial === 'YELLOW' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300' :
                                                                                    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300'
                                                                                }`}>
                                                                                <DollarSign className="w-3 h-3" />
                                                                                <span>Finanzas</span>
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="right">
                                                                            <p className="font-semibold">Salud Financiera</p>
                                                                            <p className="text-xs">Basado en el margen actual ({(fin.priceNet > 0 ? (fin.marginAmountNet / fin.priceNet) : 0).toLocaleString('es-CL', { style: 'percent' })})</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </div>

                                                            {/* Time Health */}
                                                            {project.plannedEndDate && (
                                                                <div className="flex items-center gap-2">
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border cursor-help w-fit ${fin.trafficLightTime === 'RED' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300' :
                                                                                    fin.trafficLightTime === 'YELLOW' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300' :
                                                                                        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300'
                                                                                    }`}>
                                                                                    <Timer className="w-3 h-3" />
                                                                                    <span>Tiempo</span>
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="right">
                                                                                <p className="font-semibold">Salud de Plazos</p>
                                                                                <p className="text-xs">
                                                                                    {fin.trafficLightTime === 'RED' ? 'Atrasado' : fin.trafficLightTime === 'YELLOW' ? 'Por vencer' : 'A tiempo'}
                                                                                </p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col text-sm">
                                                    <span className="font-medium text-foreground">
                                                        {formatCurrency(fin.priceGross)} <span className="text-xs text-muted-foreground font-normal">Total</span>
                                                    </span>

                                                    {/* Financial Health Indicator */}
                                                    <div className="mt-1.5 flex flex-col gap-0.5">
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            Margen:
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs font-bold ${fin.trafficLightFinancial === 'RED' ? 'text-red-600' :
                                                                fin.trafficLightFinancial === 'YELLOW' ? 'text-yellow-600' :
                                                                    'text-green-600'
                                                                }`}>
                                                                {formatCurrency(fin.marginAmountNet)}
                                                            </span>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${fin.trafficLightFinancial === 'RED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                fin.trafficLightFinancial === 'YELLOW' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                }`}>
                                                                {fin.priceNet > 0 ? ((fin.marginAmountNet / fin.priceNet) * 100).toFixed(0) : 0}%
                                                            </span>

                                                            {fin.trafficLightFinancial === 'RED' && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <AlertTriangle className="w-3 h-3 text-red-600 cursor-help" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="bg-destructive text-destructive-foreground border-destructive">
                                                                            <p className="font-semibold flex items-center gap-1.5">
                                                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                                                ¡Alerta Financiera! Margen negativo.
                                                                            </p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </div>
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
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        EN_CURSO: "bg-blue-100/50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
        EN_ESPERA: "bg-yellow-100/50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20",
        BLOQUEADO: "bg-red-100/50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20",
        CERRADO: "bg-green-100/50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border-green-200 dark:border-green-500/20",
        CANCELADO: "bg-muted text-muted-foreground border-border",
    };

    const label = status.replace('_', ' ');

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${styles[status] || styles.CANCELADO}`}>
            {label}
        </span>
    );
}
