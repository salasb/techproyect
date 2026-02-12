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
        blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
        emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400",
        purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400",
    }

    const isPositive = trend >= 0;

    return (
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <div className={`p-2 rounded-lg ${colors[color]}`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <div className="mt-4">
                <h3 className="text-2xl font-bold text-foreground">{value}</h3>
                {trend !== undefined && (
                    <div className="flex items-center mt-1 gap-2">
                        <span className={`flex items-center text-xs font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                            {Math.abs(trend).toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground">{trendText}</span>
                    </div>
                )}
                {subtext && (
                    <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
                )}
            </div>
        </div>
    );
}
