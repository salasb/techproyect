"use client";

import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface ProjectMarginChartProps {
    data: {
        name: string;
        marginPct: number;
    }[];
}

export function ProjectMarginChart({ data }: ProjectMarginChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground bg-card border border-border rounded-xl">
                No data available
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-6">Rentabilidad por Proyecto (%)</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={100}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                            formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Margen']}
                            cursor={{ fill: 'transparent' }}
                        />
                        <ReferenceLine x={0} stroke="hsl(var(--border))" />
                        <Bar dataKey="marginPct" barSize={20} radius={[0, 4, 4, 0]}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={
                                        entry.marginPct < 15 ? '#ef4444' :
                                            entry.marginPct < 30 ? '#eab308' :
                                                '#22c55e'
                                    }
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
