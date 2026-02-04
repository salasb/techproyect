import Link from "next/link";
import { Plus, AlertTriangle, Lock, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { calculateProjectFinancials } from "@/services/financialCalculator";
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
            invoices:Invoice(*)
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
                                <th className="px-6 py-3 font-medium">Avance</th>
                                <th className="px-6 py-3 font-medium">Finanzas (Estimado)</th>
                                <th className="px-6 py-3 font-medium text-right">Acciones</th>
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
                                        settings!
                                    );

                                    // Alert Logic
                                    const today = new Date();
                                    const nextActionDate = project.nextActionDate ? new Date(project.nextActionDate) : null;
                                    const isOverdue = nextActionDate && isBefore(startOfDay(nextActionDate), startOfDay(today));
                                    const isDueToday = nextActionDate && differenceInCalendarDays(nextActionDate, today) === 0;

                                    return (
                                        <tr key={project.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <Link href={`/projects/${project.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                                                        {project.name}
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
                                                            {nextActionDate && <span className="opacity-75">{nextActionDate.toLocaleDateString()}</span>}
                                                        </div>
                                                    </div>
                                                ) : <span className="text-muted-foreground text-xs">-</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="w-24">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span>{project.progress}%</span>
                                                    </div>
                                                    <div className="w-full bg-secondary rounded-full h-1.5">
                                                        <div
                                                            className={`h-1.5 rounded-full ${fin.trafficLightTime === 'RED' ? 'bg-destructive' : 'bg-blue-600'}`}
                                                            style={{ width: `${project.progress}%` }}
                                                        ></div>
                                                    </div>
                                                    {fin.trafficLightTime === 'RED' && <span className="text-[10px] text-destructive font-medium">Atrasado</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col text-sm">
                                                    <span className="font-medium text-foreground">
                                                        ${fin.priceGross.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">Total</span>
                                                    </span>
                                                    <span className={`text-xs font-medium ${fin.marginAmountNet < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        Margen: ${fin.marginAmountNet.toLocaleString()} ({(project.marginPct * 100).toFixed(0)}%)
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link href={`/projects/${project.id}`} className="text-primary hover:text-primary/80 font-medium text-sm">
                                                    Gestionar
                                                </Link>
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
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.CANCELADO}`}>
            {label}
        </span>
    );
}
