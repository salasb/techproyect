'use client';

import { InventoryMetrics } from "@/app/actions/inventory-analytics";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { DollarSign, Package, AlertTriangle, TrendingUp, Archive, Layers } from "lucide-react";

// Local formatter to avoid import issues and define strict types for Recharts
const formatCurrency = (value: number | string | undefined) => {
    if (value === undefined || value === null) return '$0';
    return `$${Number(value).toLocaleString('es-CL')}`;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function InventoryAnalytics({ metrics }: { metrics: InventoryMetrics }) {

    // Helper to format values for tooltips
    const formatValue = (value: number) => [formatCurrency(value), 'Valor'];
    const formatPieValue = (value: number) => formatCurrency(value);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-card border border-border rounded-xl p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 h-full w-1 bg-emerald-500"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Valor Inventario (Venta)</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{formatCurrency(metrics.totalValue)}</h3>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-card border border-border rounded-xl p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1 bg-blue-500"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Costo Total</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{formatCurrency(metrics.totalCost)}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Archive className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-card border border-border rounded-xl p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1 bg-indigo-500"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Margen Potencial</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{formatCurrency(metrics.potentialMargin)}</h3>
                            <p className="text-xs text-indigo-500 font-medium mt-1">
                                {metrics.totalValue > 0 ? ((metrics.potentialMargin / metrics.totalValue) * 100).toFixed(1) : 0}% Margen
                            </p>
                        </div>
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-card border border-border rounded-xl p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1 bg-orange-500"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Items Críticos</p>
                            <div className="flex items-baseline gap-2 mt-2">
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{metrics.lowStockItems}</h3>
                                <span className="text-xs text-slate-400">/ {metrics.totalItems} total</span>
                            </div>
                        </div>
                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Location Distribution */}
                <div className="bg-white dark:bg-card border border-border rounded-xl p-6 shadow-sm lg:col-span-2">
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-slate-400" />
                        Valor por Ubicación
                    </h4>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics.stockByLocation} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value / 1000}k`}
                                />
                                <RechartsTooltip
                                    formatter={formatValue as any}
                                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Stock Stats */}
                <div className="bg-white dark:bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">Métricas de Inventario</h4>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm">
                                    <Package className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Unidades Totales</p>
                                    <p className="text-xs text-slate-500">En todas las bodegas</p>
                                </div>
                            </div>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{metrics.totalItems}</span>
                        </div>

                        {/* Can add more detailed stats here or a mini pie chart */}
                        <div className="h-[200px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={metrics.stockByLocation}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {metrics.stockByLocation.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={formatPieValue as any} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-sm font-medium text-slate-400">Distribución</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
