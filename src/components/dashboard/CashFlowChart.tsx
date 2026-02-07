'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts"

interface CashFlowChartProps {
    data: { name: string; value: number }[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

export function CashFlowChart({ data }: CashFlowChartProps) {
    if (!data || data.length === 0 || data.every(d => d.value === 0)) {
        return (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
                No hay proyecciones de flujo de caja para los próximos 3 meses.
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
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
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                Proyección
                                            </span>
                                            <span className="font-bold text-muted-foreground">
                                                {payload[0].payload.name}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                Monto
                                            </span>
                                            <span className="font-bold">
                                                ${new Intl.NumberFormat('es-CL').format(payload[0].value as number)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                        return null
                    }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}
