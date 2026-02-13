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
        blue: "text-blue-600 bg-blue-100/50 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        emerald: "text-emerald-600 bg-emerald-100/50 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
        purple: "text-purple-600 bg-purple-100/50 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    }

    const isPositive = trend >= 0;

    return (
        <div className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950/50">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-zinc-50/50 opacity-0 transition-opacity group-hover:opacity-100 dark:to-zinc-900/50" />

            <div className="relative z-10 flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <div className={`rounded-lg border p-2 shadow-sm ${colors[color]}`}>
                    <Icon className="h-4 w-4" />
                </div>
            </div>

            <div className="relative z-10 mt-4">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>

                {trend !== undefined && (
                    <div className="mt-1 flex items-center gap-2">
                        <span className={`flex items-center text-xs font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isPositive ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                            {Math.abs(trend).toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground">{trendText}</span>
                    </div>
                )}

                {subtext && (
                    <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
                )}
            </div>
        </div>
    );
}
