'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
    title: string;
    value: number;
    data: { date: string; value: number }[];
    periodLabel: string;
    tooltip?: string;
}

export function ProfitTrendCard({ title, value, data, periodLabel, tooltip }: Props) {
    const isPositive = value >= 0;

    // Calculate trend (improvement over previous period - simplified as slope of last items)
    // We'll just use the sign of the total value for color for now, logic can be enhanced
    const trendColor = isPositive ? "#10B981" : "#EF4444"; // Emerald vs Red
    const gradientId = `colorTrend-${title.replace(/\s/g, '')}`;

    return (
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
            <div className="flex justify-between items-start z-10">
                <div>
                    <div className="flex items-center gap-1.5 mb-1">
                        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                        {tooltip && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-help hover:text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">{tooltip}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        ${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center">
                        <span className={`flex items-center font-medium mr-1 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            {periodLabel}
                        </span>
                    </p>
                </div>
                <div className={`p-2 rounded-lg ${isPositive ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600'}`}>
                    <DollarSign className="w-4 h-4" />
                </div>
            </div>

            {/* Sparkline Chart */}
            <div className="h-[60px] w-full mt-4 -mb-2 -ml-2" style={{ width: 'calc(100% + 16px)' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={trendColor} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <RechartsTooltip
                            contentStyle={{ display: 'none' }}
                            cursor={{ stroke: trendColor, strokeWidth: 1 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={trendColor}
                            fillOpacity={1}
                            fill={`url(#${gradientId})`}
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
