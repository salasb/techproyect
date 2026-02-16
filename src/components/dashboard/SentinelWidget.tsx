import { SentinelInsight } from "@/services/sentinel";
import { AlertCircle, ArrowRight, ShieldCheck, TrendingDown, PackageSearch } from "lucide-react";
import Link from "next/link";

export function SentinelWidget({ insights }: { insights: SentinelInsight[] }) {
    if (insights.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Sentinel: Todo Bajo Control</h3>
                    <p className="text-xs text-slate-500">No se detectaron riesgos proactivos en este momento.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Agente Sentinel: Insights</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {insights.map((insight) => (
                    <div key={insight.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex gap-4">
                            <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${insight.severity === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                                }`}>
                                {insight.type === 'STOCK_CRITICAL' ? <PackageSearch className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                        {insight.title}
                                    </h4>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${insight.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {insight.severity}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-2">{insight.message}</p>
                                <Link
                                    href={insight.actionHref}
                                    className="pt-2 flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                                >
                                    {insight.actionLabel}
                                    <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
