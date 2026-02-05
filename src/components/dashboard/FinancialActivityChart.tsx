"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"

interface FinancialData {
    label: string;
    income: number;
    expenses: number;
}

interface Props {
    data: FinancialData[];
}

export function FinancialActivityChart({ data }: Props) {
    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-zinc-400">
                No hay datos financieros suficientes para mostrar.
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
                <XAxis
                    dataKey="label"
                    stroke="#71717A"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#71717A"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                    cursor={{ fill: 'var(--muted)' }}
                    contentStyle={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        color: 'var(--foreground)',
                        borderRadius: 'var(--radius)',
                        boxShadow: 'var(--shadow-lg)'
                    }}
                    labelStyle={{ color: 'var(--muted-foreground)' }}
                    formatter={(value: any) => [`$${value.toLocaleString()}`, undefined]}
                />
                <Legend iconType="circle" />
                <Bar
                    dataKey="income"
                    name="Facturado"
                    fill="#2563EB"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                />
                <Bar
                    dataKey="expenses"
                    name="Costos"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}
