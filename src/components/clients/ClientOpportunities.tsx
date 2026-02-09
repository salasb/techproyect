import { Database } from "@/types/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DollarSign, Calendar, ArrowUpRight, TrendingUp } from "lucide-react";
import Link from "next/link";

type Opportunity = Database['public']['Tables']['Opportunity']['Row'];

interface Props {
    opportunities: Opportunity[];
    clientId: string;
}

export function ClientOpportunities({ opportunities, clientId }: Props) {
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'WON': return 'bg-green-100 text-green-700 border-green-200';
            case 'LOST': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-blue-50 text-blue-700 border-blue-200';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    Oportunidades ({opportunities.length})
                </h3>
                <Link href={`/crm/opportunities/new?clientId=${clientId}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
                    + Crear Oportunidad
                </Link>
            </div>

            {opportunities.length === 0 ? (
                <div className="text-center py-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <p className="text-sm text-zinc-500 italic">No hay oportunidades activas para este cliente.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {opportunities.map(opp => (
                        <div key={opp.id} className="group flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm hover:border-indigo-300 transition-all">
                            <div className="min-w-0 flex-1 mr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 transition-colors">
                                        {opp.title}
                                    </h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getStageColor(opp.stage)}`}>
                                        {opp.stage}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-zinc-500">
                                    <span className="flex items-center">
                                        <DollarSign className="w-3 h-3 mr-0.5" />
                                        {formatMoney(opp.value)}
                                    </span>
                                    {opp.expectedCloseDate && (
                                        <span className="flex items-center">
                                            <Calendar className="w-3 h-3 mr-0.5" />
                                            {format(new Date(opp.expectedCloseDate), 'd MMM yyyy', { locale: es })}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Link href={`/crm/opportunities/${opp.id}`} className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                                <ArrowUpRight className="w-4 h-4" />
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
