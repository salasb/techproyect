import { ArrowDownRight, ArrowUpRight, DollarSign, TrendingUp, Wallet } from "lucide-react";

interface KPIData {
    billing: { value: number, previous: number, trend: number };
    margin: { value: number, previous: number, trend: number };
    pipeline: { value: number, count: number };
}

export function DashboardKPIs({ data }: { data: KPIData }) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {/* 1. Facturación Real */}
            <KPICard
                title="Facturación Real"
                value={formatCurrency(data.billing.value)}
                trend={data.billing.trend}
                trendText="vs periodo anterior"
                icon={DollarSign}
                color="blue"
            />

            {/* 2. Margen Global */}
            <KPICard
                title="Margen Global"
                value={formatCurrency(data.margin.value)}
                trend={data.margin.trend}
                trendText="vs periodo anterior"
                icon={Wallet}
                color="emerald"
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
