import { ArrowDownRight, ArrowUpRight, DollarSign, TrendingUp, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface KPIData {
    billing: { value: number, previous: number, trend: number };
    margin: { value: number, previous: number, trend: number }; // Kept for compat if needed, but we use new props
    earnedMargin?: number;
    projectedMargin?: number;
    pipeline: { value: number, count: number };
}

export function DashboardKPIs({ data, isLoading }: { data?: KPIData, isLoading?: boolean }) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
    };

    if (isLoading || !data) {
        return (
            <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-card rounded-xl border border-border p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                        <div className="mt-4 space-y-2">
                            <Skeleton className="h-8 w-32" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-4">
            {/* 1. Facturación Real */}
            <KPICard
                title="Facturación Real"
                value={formatCurrency(data.billing.value)}
                trend={data.billing.trend}
                trendText="vs periodo anterior"
                icon={DollarSign}
                color="blue"
            />

            {/* 2. Margen Ganado (Real) - NEW */}
            <KPICard
                title="Margen Ganado (Real)"
                value={formatCurrency(data.earnedMargin || 0)}
                subtext="Proyectos En Curso / Finalizados"
                icon={Wallet}
                color="emerald"
            />

            {/* 3. Margen Proyectado (Potencial) - NEW */}
            <KPICard
                title="Margen Proyectado"
                value={formatCurrency(data.projectedMargin || 0)}
                subtext="Incluye En Espera"
                icon={TrendingUp} // Changed icon to distinguish
                color="blue"
            />

            {/* 3. Oportunidades (Pipeline) */}
            <KPICard
                title="Oportunidades por Cerrar"
                value={formatCurrency(data.pipeline.value)}
                subtext={`${data.pipeline.count} oportunidades activas`}
                icon={TrendingUp}
                color="purple"
            />
        </div>
    );
}

function KPICard({ title, value, trend, trendText, subtext, icon: Icon, color }: any) {
    const colors: any = {
        blue: {
            bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40",
            border: "border-blue-200 dark:border-blue-800",
            icon: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50",
            text: "text-blue-700 dark:text-blue-300"
        },
        emerald: {
            bg: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/40",
            border: "border-emerald-200 dark:border-emerald-800",
            icon: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50",
            text: "text-emerald-700 dark:text-emerald-300"
        },
        purple: {
            bg: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/40",
            border: "border-purple-200 dark:border-purple-800",
            icon: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50",
            text: "text-purple-700 dark:text-purple-300"
        },
    }

    const theme = colors[color] || colors.blue;
    const isPositive = trend >= 0;

    return (
        <div className={`group relative overflow-hidden rounded-xl border ${theme.border} ${theme.bg} p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg h-full`}>

            <div className="relative z-10 flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
                <div className={`rounded-xl p-2.5 shadow-sm ${theme.icon} transition-transform group-hover:scale-110 duration-300`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>

            <div className="relative z-10">
                <h3 className="text-4xl font-extrabold tracking-tight text-foreground mb-1">{value}</h3>

                <div className="flex items-center justify-between mt-2">
                    {trend !== undefined && (
                        <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 rounded-full px-2 py-0.5 backdrop-blur-sm self-start">
                            <span className={`flex items-center text-xs font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {isPositive ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                                {Math.abs(trend).toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase">{trendText}</span>
                        </div>
                    )}

                    {subtext && (
                        <p className="text-xs font-medium text-muted-foreground ml-auto">{subtext}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
