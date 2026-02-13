'use client'

import { useState, useRef, useOptimistic, startTransition } from "react";
import { Database } from "@/types/supabase";
import { addQuoteItem, removeQuoteItem, updateQuoteItem, toggleQuoteItemSelection, toggleAllQuoteItems, addQuoteItemsBulk } from "@/actions/quote-items";
import { getProducts } from "@/actions/products";
import { Plus, Trash2, Tag, DollarSign, Loader2, Package, Hash, Search, Save, Edit2, X, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ItemDetailRenderer } from "./ItemDetailRenderer";

type QuoteItem = Database['public']['Tables']['QuoteItem']['Row'] & { isSelected?: boolean };

interface Props {
    projectId: string;
    items: QuoteItem[];
    defaultMargin?: number;
    baseCurrency?: string;
    displayCurrency?: string;
    exchangeRate?: { value: number };
    ufRate?: { value: number };
    isLocked?: boolean;
}

export function QuoteItemsManager({
    projectId,
    items,
    defaultMargin = 30,
    baseCurrency = 'CLP',
    displayCurrency = 'CLP',
    exchangeRate,
    ufRate,
    isLocked = false
}: Props) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);



    // Optimistic State
    const [optimisticItems, setOptimisticItems] = useOptimistic(
        items,
        (state, action: { type: 'TOGGLE_ONE'; id: string; isSelected: boolean } | { type: 'TOGGLE_ALL'; isSelected: boolean }) => {
            if (action.type === 'TOGGLE_ONE') {
                return state.map(item => item.id === action.id ? { ...item, isSelected: action.isSelected } : item);
            } else if (action.type === 'TOGGLE_ALL') {
                return state.map(item => ({ ...item, isSelected: action.isSelected }));
            }
            return state;
        }
    );

    // Helper for currency conversion and formatting
    const formatMoney = (amount: number) => {
        let value = amount;
        let targetCurrency = displayCurrency;

        // 1. Calculate Value in Target Currency (if different from base)
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
        if (targetCurrency === 'CLP') return 'CLP ' + Math.round(value).toLocaleString('es-CL');
        if (targetCurrency === 'USD') return 'USD ' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        if (targetCurrency === 'UF') return 'UF ' + value.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return 'CLP ' + Math.round(value).toLocaleString('es-CL');
    }

    // Helper for rounding based on target currency
    const roundMoney = (amount: number) => {
        if (!amount) return 0;
        if (displayCurrency === 'UF') {
            return Math.round(amount * 100) / 100;
        }
        return Math.round(amount);
    };

    // Form states
    const [quantity, setQuantity] = useState(1);
    const [unit, setUnit] = useState("UN");
    const [costNet, setCostNet] = useState(0);
    const [marginPct, setMarginPct] = useState(defaultMargin); // Use defaultMargin prop
    const [priceNet, setPriceNet] = useState(0);




    const showForm = isAdding || editingItem !== null;

    // Handlers for auto-calculation
    function handleCostChange(val: number) {
        setCostNet(val); // Allow typing decimals, blur will fix if needed
        // Keep Margin, Update Price
        const marginDecimal = marginPct / 100;
        const newPrice = val / (1 - marginDecimal);
        if (isFinite(newPrice)) setPriceNet(roundMoney(newPrice));
    }

    function handleMarginChange(val: number) {
        setMarginPct(val);
        // Keep Cost, Update Price
        const marginDecimal = val / 100;
        const newPrice = costNet / (1 - marginDecimal);
        if (isFinite(newPrice)) setPriceNet(roundMoney(newPrice));
    }

    function handlePriceChange(val: number) {
        setPriceNet(val);
        if (val > 0) {
            const newMargin = ((val - costNet) / val) * 100;
            setMarginPct(Math.round(newMargin)); // Round to integer
        }
    }

    const { toast } = useToast();

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        try {
            if (editingItem) {
                await updateQuoteItem(editingItem.id, projectId, formData);
                setEditingItem(null);
                toast({ type: 'success', message: "Ítem actualizado" });
            } else {
                await addQuoteItem(projectId, formData);
                setIsAdding(false);
                resetForm();
                toast({ type: 'success', message: "Ítem agregado correctamente" });
            }
        } catch (error) {
            toast({ type: 'error', message: "Error al guardar ítem" });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    function confirmDelete(itemId: string) {
        setItemToDelete(itemId);
    }

    async function handleConfirmDelete() {
        if (!itemToDelete) return;
        setIsLoading(true);
        try {
            await removeQuoteItem(itemToDelete, projectId);
            toast({ type: 'success', message: "Ítem eliminado" });
        } catch (error) {
            toast({ type: 'error', message: "Error al eliminar ítem" });
        } finally {
            setIsLoading(false);
            setItemToDelete(null);
        }
    }

    function startEdit(item: QuoteItem) {
        setEditingItem(item);
        setIsAdding(false);

        // Initialize State
        setQuantity(item.quantity);
        setUnit(item.unit);
        setCostNet(roundMoney(item.costNet));
        setPriceNet(roundMoney(item.priceNet));

        // Calculate margin for state
        if (item.priceNet > 0) {
            const m = ((item.priceNet - item.costNet) / item.priceNet) * 100;
            setMarginPct(Math.round(m)); // Round to integer
        } else {
            setMarginPct(0);
        }

        // Scroll to form needs a small delay for render
        setTimeout(() => {
            document.getElementById('item-form')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    function resetForm() {
        setQuantity(1);
        setUnit("UN");
        setCostNet(0);
        setPriceNet(0);
        setMarginPct(defaultMargin);
    }

    function cancelForm() {
        setIsAdding(false);
        setEditingItem(null);
        resetForm();
    }

    // Selection Logic using Optimistic State
    const allSelected = optimisticItems.length > 0 && optimisticItems.every(i => i.isSelected !== false);
    const someSelected = optimisticItems.some(i => i.isSelected !== false) && !allSelected;

    async function handleToggleItem(id: string, current: boolean) {
        // Optimistic update
        startTransition(() => {
            setOptimisticItems({ type: 'TOGGLE_ONE', id, isSelected: !current });
        });

        try {
            await toggleQuoteItemSelection(id, projectId, !current);
        } catch (error) {
            console.error("error in handleToggleItem", error);
            toast({ type: 'error', message: "Error al actualizar selección" });
            // Revalidation will revert optimistic state if failed
        }
    }

    async function handleToggleAll() {
        if (optimisticItems.length === 0) return;
        const newValue = !allSelected;

        // Optimistic update
        startTransition(() => {
            setOptimisticItems({ type: 'TOGGLE_ALL', isSelected: newValue });
        });

        try {
            await toggleAllQuoteItems(projectId, newValue);
        } catch (error) {
            console.error("error in handleToggleAll", error);
            toast({ type: 'error', message: "Error al actualizar selección global" });
        }
    }

    // Filter items for totals using Optimistic State
    const activeItems = optimisticItems.filter(i => i.isSelected !== false);
    const selectedCount = activeItems.length;
    const totalCount = optimisticItems.length;

    const totalNet = activeItems.reduce((acc, item) => acc + (item.priceNet * item.quantity), 0);
    const totalCost = activeItems.reduce((acc, item) => acc + (item.costNet * item.quantity), 0);
    const totalMargin = totalNet - totalCost;
    const projectMarginPct = totalNet > 0 ? (totalMargin / totalNet) * 100 : 0;

    // Visibility Logic
    const showSku = optimisticItems.some(item => item.sku && item.sku.trim().length > 0 && item.sku !== '-');

    function getMarginColorClass(margin: number) {
        const m = Math.round(margin);
        if (m <= 5) return 'text-red-600 bg-red-100 border-red-200'; // Critical (0-5%)
        if (m <= 15) return 'text-yellow-600 bg-yellow-100 border-yellow-200'; // Warning (6-15%)
        return 'text-green-600 bg-green-100 border-green-200'; // Healthy (> 15%)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium text-foreground">Ítems de Cotización</h3>
                    {totalCount > 0 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            {selectedCount} / {totalCount}
                        </span>
                    )}
                </div>
                <div className="text-right flex items-center gap-4">
                    <div className="flex flex-col items-end mr-4">
                        <p className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider">Costo</p>
                        <p className="text-base font-medium text-zinc-500">{formatMoney(totalCost)}</p>
                    </div>

                    <div className="flex flex-col items-end mr-4">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="cursor-help flex flex-col items-end">
                                        <p className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider flex items-center gap-1">
                                            Margen <AlertCircle className="w-3 h-3" />
                                        </p>
                                        <div className={`px-2.5 py-0.5 rounded-full text-sm font-bold border ${projectMarginPct > 15 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : (projectMarginPct <= 5 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200')}`}>
                                            {projectMarginPct.toFixed(0)}%
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-semibold mb-1">Margen Ponderado Real</p>
                                    <p className="text-xs">
                                        (Venta Total - Costo Total) / Venta Total
                                        <br />
                                        <span className="opacity-70">
                                            ({formatMoney(totalNet)} - {formatMoney(totalCost)}) / {formatMoney(totalNet)}
                                        </span>
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 px-5 py-3 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider mb-0.5">Total Neto</p>
                        <p className="text-3xl font-black text-blue-700 dark:text-blue-300 tracking-tight">{formatMoney(totalNet)}</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-700 dark:text-slate-200 uppercase bg-slate-100 dark:bg-slate-800/80 border-b border-zinc-200 dark:border-zinc-700 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 w-10 text-center">
                                <input
                                    type="checkbox"
                                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                                    checked={allSelected}
                                    ref={input => { if (input) input.indeterminate = someSelected; }}
                                    onChange={handleToggleAll}
                                    disabled={isLocked}
                                />
                            </th>
                            {showSku && <th className="px-4 py-3 font-medium w-24">SKU</th>}
                            <th className="px-4 py-3 font-medium">Detalle</th>
                            <th className="px-4 py-3 font-medium w-16 text-center">Cant.</th>
                            <th className="px-4 py-3 font-medium w-32 text-right text-zinc-500">Costo U.</th>
                            <th className="px-4 py-3 font-medium w-40 text-right">Precio V.</th>
                            <th className="px-4 py-3 font-medium w-24 text-center">Margen</th>
                            <th className="px-4 py-3 font-medium text-right w-40">Total</th>
                            <th className="px-4 py-3 font-medium text-right w-24">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={showSku ? 9 : 8} className="px-6 py-12 text-center text-muted-foreground">
                                    No hay ítems registrados. Comienza agregando uno.
                                </td>
                            </tr>
                        ) : (
                            optimisticItems.map((item) => {
                                const isSelected = item.isSelected !== false; // Default true
                                const margin = item.priceNet - item.costNet;
                                const marginP = item.priceNet > 0 ? (margin / item.priceNet) * 100 : 0;

                                return (
                                    <tr key={item.id} className={`group hover:bg-muted/50 transition-all duration-300 animate-in fade-in slide-in-from-left-2 ${!isSelected ? 'bg-zinc-50/50 dark:bg-zinc-900/20 opacity-60 grayscale-[0.5]' : ''}`}>
                                        <td className="px-4 py-3 text-center align-top">
                                            <input
                                                type="checkbox"
                                                className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                                                checked={isSelected}
                                                onChange={() => handleToggleItem(item.id, isSelected)}
                                                disabled={isLocked}
                                            />
                                        </td>
                                        {showSku && (
                                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap font-mono text-xs align-top">
                                                {item.sku}
                                            </td>
                                        )}
                                        <td className="px-4 py-3 align-top">
                                            <ItemDetailRenderer text={item.detail} unit={item.unit} />
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold align-top">
                                            {item.quantity}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-xs text-zinc-500 align-top">
                                            {formatMoney(item.costNet)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-medium align-top whitespace-nowrap">
                                            {formatMoney(item.priceNet)}
                                        </td>
                                        <td className="px-4 py-3 text-center align-top">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getMarginColorClass(marginP)}`}>
                                                {marginP.toFixed(0)}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-foreground font-semibold align-top whitespace-nowrap">
                                            {formatMoney(item.priceNet * item.quantity)}
                                        </td>
                                        <td className="px-4 py-3 text-right align-top">

                                            {!isLocked && (
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => startEdit(item)}
                                                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500 hover:text-blue-600 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDelete(item.id)}
                                                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500 hover:text-red-600 transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>



            {/* Add/Edit Form */}
            {
                showForm ? (
                    <form id="item-form" action={handleSubmit} className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-xl border border-blue-200 dark:border-blue-900/50 animate-in slide-in-from-top-2 ring-1 ring-blue-500/20 mt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase flex items-center">
                                {editingItem ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                {editingItem ? 'Editar Ítem' : 'Nuevo Ítem'}
                            </h4>
                            <button type="button" onClick={cancelForm} className="text-zinc-400 hover:text-zinc-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                            <div className="md:col-span-8">
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Descripción / Detalle</label>
                                <div className="relative">
                                    {/* Changed from Input to Textarea for Smart List support */}
                                    <textarea
                                        name="detail"
                                        required
                                        autoComplete="off"
                                        defaultValue={editingItem?.detail}
                                        placeholder="Describe el ítem... (Presiona Enter para crear listas)"
                                        rows={3}
                                        className="w-full p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1 mx-1">
                                        Tip: Usa saltos de línea para crear una lista automática en la vista.
                                    </p>
                                </div>
                            </div>

                            <div className="md:col-span-2 hidden">
                                <input name="sku" type="hidden" defaultValue={editingItem?.sku || ''} />
                            </div>

                            <div className="md:col-span-4 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Cantidad</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                        <input
                                            name="quantity"
                                            type="number"
                                            required
                                            min="1"
                                            step="1" // Force Integer
                                            defaultValue={editingItem?.quantity || 1}
                                            className="w-full pl-9 pr-2 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Unidad</label>
                                    <select
                                        name="unit"
                                        required
                                        defaultValue={editingItem?.unit || "UN"}
                                        className="w-full px-2 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="UN">UN</option>
                                        <option value="GL">GL</option>
                                        <option value="HR">Horas</option>
                                        <option value="MT">Metros</option>
                                        <option value="M2">M2</option>
                                        <option value="M3">M3</option>
                                        <option value="VG">Viajes</option>
                                    </select>
                                </div>
                            </div>

                            {/* Financial Row */}
                            <div className="md:col-span-12 grid grid-cols-12 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                                <div className="col-span-4">
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Costo Unit.</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                        <input
                                            name="costNet"
                                            type="number"
                                            required
                                            min="0"
                                            step={displayCurrency === 'UF' ? "0.01" : "1"}
                                            defaultValue={editingItem?.costNet}
                                            value={costNet || (editingItem ? undefined : '')}
                                            placeholder="0"
                                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                            onChange={(e) => handleCostChange(Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <label className="block text-xs font-medium text-blue-600 mb-1 cursor-help underline decoration-dotted">Margen %</label>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Ganancia sobre venta: <br /><code>(Precio - Costo) / Precio</code></p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <div className="relative">
                                        <input
                                            name="marginPct"
                                            type="number"
                                            step="1" // Force Integer
                                            className="w-full pl-2 pr-6 py-2 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center text-blue-700 dark:text-blue-400"
                                            value={marginPct}
                                            onChange={(e) => handleMarginChange(Number(e.target.value))}
                                        />
                                        <span className="absolute right-3 top-2 text-xs text-blue-400">%</span>
                                    </div>
                                </div>

                                <div className="col-span-4">
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Precio Venta</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                        <input
                                            name="priceNet"
                                            type="number"
                                            required
                                            min="0"
                                            step={displayCurrency === 'UF' ? "0.01" : "1"}
                                            defaultValue={editingItem?.priceNet}
                                            value={priceNet || (editingItem ? undefined : '')}
                                            placeholder="0"
                                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                            onChange={(e) => handlePriceChange(Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div className="col-span-2 flex items-end">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                        {editingItem ? 'Guardar' : 'Agregar'}
                                    </button>
                                </div>
                            </div>

                            <div className="md:col-span-12 flex justify-start mt-2">
                                <button
                                    type="button"
                                    onClick={cancelForm}
                                    className="text-xs text-zinc-400 hover:text-zinc-600 underline"
                                >
                                    Cancelar edición
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    !isLocked && (
                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => {
                                    resetForm();
                                    setIsAdding(true);
                                }}
                                className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Agregar Ítem
                            </button>



                        </div>
                    )
                )
            }

            <ConfirmDialog
                isOpen={!!itemToDelete}
                title="Eliminar Ítem"
                description="¿Estás seguro que deseas eliminar este ítem de la cotización? Esto afectará el total del proyecto."
                confirmText="Eliminar"
                variant="danger"
                isLoading={isLoading}
                onConfirm={handleConfirmDelete}
                onCancel={() => setItemToDelete(null)}
            />
        </div>
    );
}
