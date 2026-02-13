'use client'

import { useState } from "react";
import { Database } from "@/types/supabase";
import { addCost, deleteCost, updateCost } from "@/app/actions/costs";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Plus, Trash2, Calendar, Tag, DollarSign, Loader2, Edit2, Save, X, Info, Wand2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MoneyInput } from "@/components/ui/MoneyInput";

type CostEntry = Database['public']['Tables']['CostEntry']['Row'];
type CostCategory = Database['public']['Enums']['CostCategory'];

interface Props {
    projectId: string;
    costs: CostEntry[];
    baseCurrency?: string;
    displayCurrency?: string;
    exchangeRate?: { value: number };
    ufRate?: { value: number };
    isLocked?: boolean;
}

const CATEGORIES: { value: CostCategory; label: string }[] = [
    { value: 'SERVICIOS', label: 'Servicios Profesionales' },
    { value: 'HARDWARE', label: 'Hardware / Equipos' },
    { value: 'SOFTWARE', label: 'Software / Licencias' },
    { value: 'LOGISTICA', label: 'Logística y Viajes' },
    { value: 'OTROS', label: 'Otros Gastos' },
];

export function CostsManager({
    projectId,
    costs,
    baseCurrency = 'CLP',
    displayCurrency = 'CLP',
    exchangeRate,
    ufRate,
    isLocked = false
}: Props) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingCost, setEditingCost] = useState<CostEntry | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);

    // AI Categorization Logic
    const handleAiCategorize = async (description: string) => {
        if (!description || description.length < 3) return;

        setIsAiLoading(true);
        try {
            const res = await fetch('/api/ai/categorize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description })
            });

            if (!res.ok) throw new Error('AI Error');

            const data = await res.json();

            // Set category programmatically
            const categorySelect = document.querySelector('select[name="category"]') as HTMLSelectElement;
            if (categorySelect && data.category) {
                categorySelect.value = data.category;
                toast({ type: 'success', message: `Categorizado como: ${CATEGORIES.find(c => c.value === data.category)?.label}` });
            }
        } catch (error) {
            console.error("AI Categorization failed", error);
        } finally {
            setIsAiLoading(false);
        }
    };

    // Helper for currency conversion and formatting
    const formatMoney = (amount: number) => {
        let value = amount;
        let targetCurrency = displayCurrency;

        // 1. Calculate Value in Target Currency
        if (baseCurrency !== targetCurrency) {
            if (baseCurrency === 'CLP') {
                if (targetCurrency === 'USD') value = amount / (exchangeRate?.value || 1);
                if (targetCurrency === 'UF') value = amount / (ufRate?.value || 1);
            }
            else if (baseCurrency === 'USD') {
                if (targetCurrency === 'CLP') value = amount * (exchangeRate?.value || 1);
                if (targetCurrency === 'UF') {
                    const clp = amount * (exchangeRate?.value || 1);
                    value = clp / (ufRate?.value || 1);
                }
            }
            else if (baseCurrency === 'UF') {
                if (targetCurrency === 'CLP') value = amount * (ufRate?.value || 1);
                if (targetCurrency === 'USD') {
                    const clp = amount * (ufRate?.value || 1);
                    value = clp / (exchangeRate?.value || 1);
                }
            }
        }

        // 2. Format
        if (targetCurrency === 'CLP') return '$' + Math.round(value).toLocaleString('es-CL');
        if (targetCurrency === 'USD') return 'US$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        if (targetCurrency === 'UF') return 'UF ' + value.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return '$' + Math.round(value).toLocaleString('es-CL');
    }

    // Dialog State
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const { toast } = useToast();

    async function handleAddCost(formData: FormData) {
        setIsLoading(true);
        try {
            if (editingCost) {
                await updateCost(projectId, editingCost.id, formData);
                setEditingCost(null);
                toast({ type: 'success', message: "Costo actualizado correctamente" });
            } else {
                await addCost(projectId, formData);
                setIsAdding(false);
                const form = document.getElementById('add-cost-form') as HTMLFormElement;
                form?.reset();
                toast({ type: 'success', message: "Costo registrado correctamente" });
            }
        } catch (error) {
            toast({ type: 'error', message: "Error al agregar costo" });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    function startEdit(cost: CostEntry) {
        setEditingCost(cost);
        setIsAdding(false);
        setTimeout(() => {
            document.getElementById('add-cost-form')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    function cancelEdit() {
        setEditingCost(null);
        setIsAdding(false);
    }

    function confirmDelete(costId: string) {
        setItemToDelete(costId);
    }

    async function handleConfirmDelete() {
        if (!itemToDelete) return;
        setIsLoading(true);
        try {
            await deleteCost(projectId, itemToDelete);
            toast({ type: 'success', message: "Costo eliminado" });
        } catch (error) {
            toast({ type: 'error', message: "Error al eliminar costo" });
        } finally {
            setIsLoading(false);
            setItemToDelete(null);
        }
    }

    const totalCosts = costs.reduce((acc, c) => acc + c.amountNet, 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium text-foreground">Registro de Costos</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Ingresa los gastos reales ejecutados. Estos montos reducirán el margen del proyecto.
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Ejecutado</p>
                    <p className="text-2xl font-bold text-foreground">{formatMoney(totalCosts)}</p>
                </div>
            </div>

            {/* List */}
            {/* List */}
            {/* List */}
            {costs.length > 0 ? (
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <div className="overflow-x-auto">
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
                                {costs.map((cost) => (
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
                                            {formatMoney(cost.amountNet)}
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            {!isLocked && (
                                                <>
                                                    <button
                                                        onClick={() => startEdit(cost)}
                                                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500 hover:text-blue-500 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDelete(cost.id)}
                                                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500 hover:text-red-500 transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                !isAdding && !isLocked && (
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-4">No hay costos registrados aún.</p>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Registrar Primer Costo
                        </button>
                    </div>
                )
            )}

            <ConfirmDialog
                isOpen={!!itemToDelete}
                title="Eliminar Costo"
                description="¿Estás seguro que deseas eliminar este registro de costo? Esta acción no se puede deshacer y afectará los márgenes del proyecto."
                confirmText="Eliminar"
                variant="danger"
                isLoading={isLoading}
                onConfirm={handleConfirmDelete}
                onCancel={() => setItemToDelete(null)}
            />

            {/* Add/Edit Form */}
            {
                isAdding || editingCost ? (
                    <form id="add-cost-form" action={handleAddCost} className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                                {editingCost ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {editingCost ? 'Editar Costo' : 'Nuevo Costo'}
                            </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                            <div className="md:col-span-4">
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Categoría</label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                    <select
                                        name="category"
                                        required
                                        defaultValue={editingCost?.category || 'OTROS'}
                                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="md:col-span-4">
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Fecha</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                    <input
                                        name="date"
                                        type="date"
                                        required
                                        defaultValue={editingCost ? new Date(editingCost.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                                        className="w-full pl-9 pr-2 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-4">
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Monto Neto</label>
                                <MoneyInput
                                    name="amount"
                                    defaultValue={editingCost?.amountNet}
                                    placeholder="0"
                                    required
                                />
                            </div>

                            <div className="md:col-span-10">
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Descripción</label>
                                <div className="relative">
                                    <input
                                        name="description"
                                        type="text"
                                        required
                                        onBlur={(e) => handleAiCategorize(e.target.value)}
                                        defaultValue={editingCost?.description || ''}
                                        placeholder="Ej: Honorarios Developer Senior"
                                        className="w-full pl-4 pr-10 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <div className="absolute right-3 top-2.5 text-zinc-400">
                                        {isAiLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                        ) : (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Wand2 className="w-4 h-4 text-indigo-400 hover:text-indigo-600 transition-colors cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Auto-categorización con IA</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full h-[38px] flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                            >
                                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCost ? <Save className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                                                {editingCost ? 'Guardar' : 'Agregar'}
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{editingCost ? 'Guardar Cambios' : 'Registrar Costo'}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                        <div className="flex justify-end mt-2">
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className="text-xs text-zinc-500 hover:text-zinc-700 underline"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                ) : (
                    costs.length > 0 && !isLocked && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Registrar Nuevo Costo
                        </button>
                    )
                )
            }
        </div >
    );
}
