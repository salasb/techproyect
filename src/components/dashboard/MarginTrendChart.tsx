'use client'

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"

interface MarginTrendChartProps {
    data: { name: string; income: number; cost: number; profit: number }[]
}

export function MarginTrendChart({ data }: MarginTrendChartProps) {
    // Transform data to get Margin %
    const chartData = data.map(d => ({
        name: d.name,
        marginPct: d.income > 0 ? (d.profit / d.income) * 100 : 0
    })).filter(d => d.marginPct > -100 && d.marginPct < 100); // Filter outliers for cleaner chart

    if (!chartData || chartData.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                No hay datos suficientes para la tendencia de márgenes.
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value.toFixed(0)}%`}
                    domain={[0, 'auto']}
                />
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                            {payload[0].payload.name}
                                        </span>
                                        <span className="font-bold text-emerald-600">
                                            Margen: {Number(payload[0].value).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            )
                        }
                        return null;
                    }}
                />
                <Line
                    type="monotone"
                    dataKey="marginPct"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#10b981" }}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>
    )
}
