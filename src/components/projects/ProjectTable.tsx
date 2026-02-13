'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Lock, Clock, Send, CheckCircle2, ChevronRight, Info } from "lucide-react";
import { Database } from "@/types/supabase";
import { format, differenceInCalendarDays, isBefore, startOfDay } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RiskBadge } from "@/components/projects/RiskBadge";
import { RiskEngine } from "@/services/riskEngine";
import { calculateProjectFinancials } from "@/services/financialCalculator";

type Project = Database['public']['Tables']['Project']['Row'] & {
    company: Database['public']['Tables']['Company']['Row'];
    costEntries: Database['public']['Tables']['CostEntry']['Row'][];
    invoices: Database['public']['Tables']['Invoice']['Row'][];
    quoteItems: Database['public']['Tables']['QuoteItem']['Row'][];
};

type Settings = Database['public']['Tables']['Settings']['Row'];

interface Props {
    projects: Project[];
    settings: Settings;
}

export function ProjectTable({ projects, settings }: Props) {
    const router = useRouter();

    if (projects.length === 0) {
        return (
            <div className="p-12 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col items-center gap-2">
                    <Info className="w-10 h-10 text-zinc-300 mb-2" />
                    <h3 className="text-lg font-medium text-foreground">No hay proyectos registrados</h3>
                    <p className="text-sm text-muted-foreground">Comienza creando el primero para gestionar tus cotizaciones.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="hidden md:block overflow-x-auto bg-card rounded-xl border border-border shadow-sm">
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
                    {projects.map((project) => {
                        // Calculate financials
                        const fin = calculateProjectFinancials(
                            project,
                            project.costEntries || [],
                            project.invoices || [],
                            settings,
                            project.quoteItems || []
                        );

                        // Risk Analysis
                        const risk = RiskEngine.calculateProjectRisk(project as any, settings);

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
                            <tr
                                key={project.id}
                                onClick={() => router.push(`/projects/${project.id}`)}
                                className="group cursor-pointer border-b border-border hover:bg-muted/50 transition-colors"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                                {project.name}
                                            </span>
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
                                        <div className={`flex items-start space-x-2 text-xs ${isOverdue ? 'text-destructive font-semibold' : isDueToday ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
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
                    })}
                </tbody>
            </table>
        </div>
    );
}
