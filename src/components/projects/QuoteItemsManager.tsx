'use client'

import { useState } from "react";
import { Database } from "@/types/supabase";
import { addQuoteItem, removeQuoteItem, updateQuoteItem } from "@/actions/quote-items";
import { getProducts } from "@/actions/products";
import { Plus, Trash2, Tag, DollarSign, Loader2, Package, Hash, Search, Save, Edit2, X, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type QuoteItem = Database['public']['Tables']['QuoteItem']['Row'];

interface Props {
    projectId: string;
    items: QuoteItem[];
}

export function QuoteItemsManager({ projectId, items }: Props) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    // Form states
    const [quantity, setQuantity] = useState(1);
    const [unit, setUnit] = useState("UN");
    const [costNet, setCostNet] = useState(0);
    const [marginPct, setMarginPct] = useState(30); // Default 30%
    const [priceNet, setPriceNet] = useState(0);

    // Determines if we are in "Form Mode" (either adding or editing)
    const showForm = isAdding || editingItem !== null;

    // Handlers for auto-calculation
    function handleCostChange(val: number) {
        setCostNet(val);
        // Keep Margin, Update Price
        const marginDecimal = marginPct / 100;
        const newPrice = val / (1 - marginDecimal);
        if (isFinite(newPrice)) setPriceNet(Math.round(newPrice));
    }

    function handleMarginChange(val: number) {
        setMarginPct(val);
        // Keep Cost, Update Price
        const marginDecimal = val / 100;
        const newPrice = costNet / (1 - marginDecimal);
        if (isFinite(newPrice)) setPriceNet(Math.round(newPrice));
    }

    function handlePriceChange(val: number) {
        setPriceNet(val);
        if (val > 0) {
            const newMargin = ((val - costNet) / val) * 100;
            setMarginPct(parseFloat(newMargin.toFixed(2)));
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
                const form = document.getElementById('item-form') as HTMLFormElement;
                form?.reset();
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
        // Calculate margin for state
        if (item.priceNet > 0) {
            const m = ((item.priceNet - item.costNet) / item.priceNet) * 100;
            setMarginPct(parseFloat(m.toFixed(2)));
        } else {
            setMarginPct(0);
        }

        // Scroll to form needs a small delay for render
        setTimeout(() => {
            document.getElementById('item-form')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    function cancelForm() {
        setIsAdding(false);
        setEditingItem(null);
    }

    const totalNet = items.reduce((acc, item) => acc + (item.priceNet * item.quantity), 0);
    const totalCost = items.reduce((acc, item) => acc + (item.costNet * item.quantity), 0);
    const totalMargin = totalNet - totalCost;
    const projectMarginPct = totalNet > 0 ? (totalMargin / totalNet) * 100 : 0;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-foreground">Ítems de Cotización</h3>
                <div className="text-right flex gap-6 items-center">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase">Costo Total</p>
                        <p className="text-lg font-semibold text-zinc-500">${totalCost.toLocaleString()}</p>
                    </div>
                    <div>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="cursor-help">
                                        <p className="text-xs text-muted-foreground uppercase flex items-center justify-end gap-1">
                                            Margen Global <AlertCircle className="w-3 h-3" />
                                        </p>
                                        <p className={`text-xl font-bold ${projectMarginPct >= 30 ? 'text-green-600' : 'text-yellow-600'}`}>{projectMarginPct.toFixed(1)}%</p>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-semibold mb-1">Margen Ponderado Real</p>
                                    <p className="text-xs">
                                        (Venta Total - Costo Total) / Venta Total
                                        <br />
                                        <span className="opacity-70">
                                            (${totalNet.toLocaleString()} - ${totalCost.toLocaleString()}) / ${totalNet.toLocaleString()}
                                        </span>
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="border-l border-zinc-200 dark:border-zinc-700 pl-6">
                        <p className="text-xs text-muted-foreground uppercase">Total Neto</p>
                        <p className="text-2xl font-bold text-foreground">${totalNet.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                        <tr>
                            <th className="px-4 py-3 font-medium w-24">SKU</th>
                            <th className="px-4 py-3 font-medium">Detalle</th>
                            <th className="px-4 py-3 font-medium w-16 text-center">Cant.</th>
                            <th className="px-4 py-3 font-medium w-32 text-right text-zinc-500">Costo U.</th>
                            <th className="px-4 py-3 font-medium w-32 text-right">Precio V.</th>
                            <th className="px-4 py-3 font-medium w-24 text-center">Margen</th>
                            <th className="px-4 py-3 font-medium text-right w-32">Total</th>
                            <th className="px-4 py-3 font-medium text-right w-24">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                                    No hay ítems registrados. Comienza agregando uno.
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => {
                                const margin = item.priceNet - item.costNet;
                                const marginP = item.priceNet > 0 ? (margin / item.priceNet) * 100 : 0;
                                return (
                                    <tr key={item.id} className="group hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap font-mono text-xs">
                                            {item.sku || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-foreground font-medium">
                                            {item.detail}
                                            <span className="text-xs text-muted-foreground ml-2">({item.unit})</span>
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold">
                                            {item.quantity}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-xs text-zinc-500">
                                            ${item.costNet.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-medium">
                                            ${item.priceNet.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${marginP < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {marginP.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-foreground font-semibold">
                                            ${(item.priceNet * item.quantity).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
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
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Form */}
            {showForm ? (
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

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-8">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Descripción / Producto</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                <input
                                    name="detail"
                                    type="text"
                                    required
                                    autoComplete="off"
                                    defaultValue={editingItem?.detail}
                                    placeholder="Descripción del ítem..."
                                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 hidden">
                            <input name="sku" type="hidden" defaultValue={editingItem?.sku || ''} />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Cantidad</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                <input
                                    name="quantity"
                                    type="number"
                                    required
                                    min="1"
                                    step="0.01"
                                    defaultValue={editingItem?.quantity || 1}
                                    className="w-full pl-9 pr-2 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
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

                        <div className="md:col-span-3">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Costo Unit.</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                <input
                                    name="costNet"
                                    type="number"
                                    required
                                    min="0"
                                    defaultValue={editingItem?.costNet}
                                    value={costNet || (editingItem ? undefined : '')}
                                    placeholder="0"
                                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                    onChange={(e) => handleCostChange(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
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
                                    step="0.01"
                                    className="w-full pl-2 pr-6 py-2 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center text-blue-700 dark:text-blue-400"
                                    value={marginPct}
                                    onChange={(e) => handleMarginChange(Number(e.target.value))}
                                />
                                <span className="absolute right-3 top-2 text-xs text-blue-400">%</span>
                            </div>
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Precio Venta</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                <input
                                    name="priceNet"
                                    type="number"
                                    required
                                    min="0"
                                    defaultValue={editingItem?.priceNet}
                                    value={priceNet || (editingItem ? undefined : '')}
                                    placeholder="0"
                                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                    onChange={(e) => handlePriceChange(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-12 flex justify-end gap-3 mt-2">
                            <button
                                type="button"
                                onClick={cancelForm}
                                className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 underline"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors shadow-md hover:shadow-lg disabled:opacity-50 flex items-center"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                {editingItem ? 'Actualizar Ítem' : 'Guardar Ítem'}
                            </button>
                        </div>
                    </div>
                </form>
            ) : (
                <button
                    onClick={() => setIsAdding(true)}
                    className="mt-6 flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Ítem
                </button>
            )}

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

