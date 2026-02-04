'use client'

import { useState } from "react";
import { Database } from "@/types/supabase";
import { addCost, deleteCost } from "@/app/actions/costs";
import { Plus, Trash2, Calendar, Tag, DollarSign, Loader2 } from "lucide-react";

type CostEntry = Database['public']['Tables']['CostEntry']['Row'];
type CostCategory = Database['public']['Enums']['CostCategory'];

interface Props {
    projectId: string;
    costs: CostEntry[];
    currency?: string;
}

const CATEGORIES: { value: CostCategory; label: string }[] = [
    { value: 'SERVICIOS', label: 'Servicios Profesionales' },
    { value: 'HARDWARE', label: 'Hardware / Equipos' },
    { value: 'SOFTWARE', label: 'Software / Licencias' },
    { value: 'LOGISTICA', label: 'Logística y Viajes' },
    { value: 'OTROS', label: 'Otros Gastos' },
];

export function CostsManager({ projectId, costs, currency = 'CLP' }: Props) {
    const [isAdding, setIsAdding] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleAddCost(formData: FormData) {
        setIsLoading(true);
        try {
            await addCost(projectId, formData);
            setIsAdding(false);
            // Reset form manually if needed or let revalidation handle it
            const form = document.getElementById('add-cost-form') as HTMLFormElement;
            form?.reset();
        } catch (error) {
            alert("Error al agregar costo");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDelete(costId: string) {
        if (!confirm("¿Estás seguro de eliminar este costo?")) return;
        try {
            await deleteCost(projectId, costId);
        } catch (error) {
            alert("Error al eliminar costo");
        }
    }

    const totalCosts = costs.reduce((acc, c) => acc + c.amountNet, 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-foreground">Registro de Costos</h3>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Ejecutado</p>
                    <p className="text-2xl font-bold text-foreground">${totalCosts.toLocaleString()}</p>
                </div>
            </div>

            {/* List */}
            {/* List */}
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                        <tr>
                            <th className="px-6 py-3 font-medium">Fecha</th>
                            <th className="px-6 py-3 font-medium">Descripción</th>
                            <th className="px-6 py-3 font-medium">Categoría</th>
                            <th className="px-6 py-3 font-medium text-right">Monto Neto</th>
                            <th className="px-6 py-3 font-medium text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {costs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                    No hay costos registrados aún.
                                </td>
                            </tr>
                        ) : (
                            costs.map((cost) => (
                                <tr key={cost.id} className="group hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                        {new Date(cost.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-foreground font-medium">
                                        {cost.description}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                                            {CATEGORIES.find(c => c.value === cost.category)?.label || cost.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-foreground">
                                        ${cost.amountNet.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(cost.id)}
                                            className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Form */}
            {isAdding ? (
                <form id="add-cost-form" action={handleAddCost} className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-white">Nuevo Costo</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-3">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Categoría</label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                <select
                                    name="category"
                                    required
                                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="md:col-span-4">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Descripción</label>
                            <input
                                name="description"
                                type="text"
                                required
                                placeholder="Ej: Honorarios Developer Senior"
                                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Fecha</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                <input
                                    name="date"
                                    type="date"
                                    required
                                    defaultValue={new Date().toISOString().split('T')[0]}
                                    className="w-full pl-9 pr-2 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Monto Neto</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                <input
                                    name="amount"
                                    type="number"
                                    required
                                    min="0"
                                    placeholder="0"
                                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-1 flex justify-end">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-[38px] flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end mt-2">
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="text-xs text-zinc-500 hover:text-zinc-700 underline"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            ) : (
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Nuevo Costo
                </button>
            )}
        </div>
    );
}
