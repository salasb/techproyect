"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface RevenueChartProps {
    data: {
        name: string;
        income: number;
        cost: number;
        profit: number;
    }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground bg-card border border-border rounded-xl">
                No data available
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-6">Ingresos vs Costos (Últimos 6 Meses)</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                            dataKey="name"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar
                            dataKey="income"
                            name="Ingresos"
                            fill="#22c55e"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={50}
                        />
                        <Bar
                            dataKey="cost"
                            name="Costos"
                            fill="#ef4444"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={50}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
