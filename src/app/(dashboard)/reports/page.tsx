'use client';

import { BarChart, FileText, PieChart, TrendingUp, AlertCircle } from "lucide-react";

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Reportes Financieros</h2>
                    <p className="text-muted-foreground">Análisis detallado del rendimiento de tus proyectos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { title: "Ingresos Totales", value: "$45.2M", icon: TrendingUp, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" },
                    { title: "Márgen Promedio", value: "32%", icon: PieChart, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
                    { title: "Proyectos Activos", value: "12", icon: FileText, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
                    { title: "Cotizaciones Pendientes", value: "5", icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
                ].map((stat, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-6 flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                            <h3 className="text-2xl font-bold text-foreground mt-2">{stat.value}</h3>
                        </div>
                        <div className={`p-3 rounded-lg ${stat.bg}`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-12 text-center">
                <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Reportes Detallados en Construcción</h3>
                    <p className="text-muted-foreground mb-6">Estamos implementando gráficas avanzadas para el análisis de costos, márgenes y proyecciones financieras.</p>
                    <button disabled className="px-4 py-2 bg-primary/10 text-primary font-medium rounded-lg opacity-50 cursor-not-allowed">
                        Próximamente
                    </button>
                </div>
            </div>
        </div>
    );
}
