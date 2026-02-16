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
                href="/invoices"
            />

            {/* 2. Margen Ganado (Real) - NEW */}
            <KPICard
                title="Margen Ganado (Real)"
                value={formatCurrency(data.earnedMargin || 0)}
                subtext="Proyectos En Curso / Finalizados"
                icon={Wallet}
                color="emerald"
                href="/projects"
            />

            {/* 3. Margen Proyectado (Potencial) - NEW */}
            <KPICard
                title="Margen Proyectado"
                value={formatCurrency(data.projectedMargin || 0)}
                subtext="Incluye En Espera"
                icon={TrendingUp}
                color="blue"
                href="/projects"
            />

            {/* 3. Oportunidades (Pipeline) */}
            <KPICard
                title="Oportunidades por Cerrar"
                value={formatCurrency(data.pipeline.value)}
                subtext={`${data.pipeline.count} oportunidades activas`}
                icon={TrendingUp}
                color="purple"
                href="/crm/pipeline"
            />
        </div>
    );
}

import Link from "next/link";

function KPICard({ title, value, trend, trendText, subtext, icon: Icon, color, href }: any) {
    const colors: any = {
        blue: {
            bg: "bg-blue-50 dark:bg-blue-950/40",
            border: "border-blue-200 dark:border-blue-800",
            icon: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50",
            text: "text-blue-700 dark:text-blue-300"
        },
        emerald: {
            bg: "bg-emerald-50 dark:bg-emerald-950/40",
            border: "border-emerald-200 dark:border-emerald-800",
            icon: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50",
            text: "text-emerald-700 dark:text-emerald-300"
        },
        purple: {
            bg: "bg-purple-50 dark:bg-purple-950/40",
            border: "border-purple-200 dark:border-purple-800",
            icon: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50",
            text: "text-purple-700 dark:text-purple-300"
        },
    }

    const theme = colors[color] || colors.blue;
    const isPositive = trend >= 0;

    // Dynamic font size logic
    const valueLength = value?.toString().length || 0;
    const valueSizeClass = valueLength > 15 ? 'text-2xl' : valueLength > 12 ? 'text-3xl' : 'text-4xl';

    const Content = (
        <div className={`peer group relative overflow-hidden rounded-xl border ${theme.border} ${theme.bg} p-6 shadow-sm transition-all duration-300 hover:shadow-md h-full flex flex-col justify-between`}>
            {/* Background decoration */}
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/40 dark:bg-white/5 blur-2xl transition-all group-hover:scale-150 group-hover:bg-white/60 dark:group-hover:bg-white/10" />

            <div className="relative z-10 flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
                <div className={`rounded-xl p-2 shadow-sm ${theme.icon} transition-transform group-hover:scale-110 duration-300`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>

            <div className="relative z-10">
                <h3 className={`${valueSizeClass} font-black tracking-tight text-foreground/90 truncate`} title={value}>
                    {value}
                </h3>

                <div className="flex items-end justify-between mt-3 min-h-[24px]">
                    {trend !== undefined && (
                        <div className={`flex items-center gap-1.5 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} font-bold text-sm bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded-lg backdrop-blur-sm shadow-sm`}>
                            {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                            {Math.abs(trend).toFixed(1)}%
                            <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1 opacity-70 hidden xl:inline">{trendText}</span>
                        </div>
                    )}

                    {subtext && (
                        <p className="text-[11px] font-medium text-muted-foreground/80 leading-tight ml-auto text-right max-w-[60%]">
                            {subtext}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="block h-full hover:scale-[1.02] transition-transform duration-300 active:scale-[0.98]">
                {Content}
            </Link>
        );
    }

    return Content;
}
