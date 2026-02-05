'use client'

import { useState } from "react";
import { Database } from "@/types/supabase";
import { addQuoteItem, removeQuoteItem } from "@/actions/quote-items";
import { getProducts } from "@/actions/products";
import { Plus, Trash2, Tag, DollarSign, Loader2, Package, Hash, Search } from "lucide-react";

type QuoteItem = Database['public']['Tables']['QuoteItem']['Row'];

interface Props {
    projectId: string;
    items: QuoteItem[];
}

export function QuoteItemsManager({ projectId, items }: Props) {
    const [isAdding, setIsAdding] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleAdd(formData: FormData) {
        setIsLoading(true);
        try {
            await addQuoteItem(projectId, formData);
            setIsAdding(false);
            const form = document.getElementById('add-item-form') as HTMLFormElement;
            form?.reset();
        } catch (error) {
            alert("Error al agregar ítem");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDelete(itemId: string) {
        if (!confirm("¿Estás seguro de eliminar este ítem?")) return;
        try {
            await removeQuoteItem(itemId, projectId);
        } catch (error) {
            alert("Error al eliminar ítem");
        }
    }

    const totalNet = items.reduce((acc, item) => acc + (item.priceNet * item.quantity), 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-foreground">Ítems de Cotización</h3>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Neto Detallado</p>
                    <p className="text-2xl font-bold text-foreground">${totalNet.toLocaleString()}</p>
                </div>
            </div>

            {/* List */}
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                        <tr>
                            <th className="px-6 py-3 font-medium w-32">SKU</th>
                            <th className="px-6 py-3 font-medium">Detalle</th>
                            <th className="px-6 py-3 font-medium w-24 text-center">Cant.</th>
                            <th className="px-6 py-3 font-medium w-24 text-center">Unid.</th>
                            <th className="px-6 py-3 font-medium text-right w-40">Precio Unit.</th>
                            <th className="px-6 py-3 font-medium text-right w-40">Total</th>
                            <th className="px-6 py-3 font-medium text-right w-24">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                    No hay ítems registrados para la cotización.
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => (
                                <tr key={item.id} className="group hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap font-mono text-xs">
                                        {item.sku || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-foreground font-medium">
                                        {item.detail}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {item.quantity}
                                    </td>
                                    <td className="px-6 py-4 text-center text-xs text-muted-foreground">
                                        {item.unit}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                                        ${item.priceNet.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-foreground font-semibold">
                                        ${(item.priceNet * item.quantity).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(item.id)}
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
                <form id="add-item-form" action={handleAdd} className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-white">Nuevo Ítem</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-6 relative group">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Buscar en Catálogo o Escribir</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                <input
                                    name="detail"
                                    type="text"
                                    required
                                    autoComplete="off"
                                    placeholder="Buscar producto..."
                                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Ingresa el nombre del ítem')}
                                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    onChange={async (e) => {
                                        const val = e.target.value;
                                        if (val.length < 2) {
                                            const list = document.getElementById('search-results');
                                            if (list) list.style.display = 'none';
                                            return;
                                        }
                                        const results = await getProducts(val);
                                        const list = document.getElementById('search-results');
                                        if (list) {
                                            list.innerHTML = '';
                                            if (results && results.length > 0) {
                                                list.style.display = 'block';
                                                results.forEach((p: any) => {
                                                    const div = document.createElement('div');
                                                    div.className = "px-4 py-2 hover:bg-zinc-100 cursor-pointer text-sm border-b border-zinc-100 last:border-0";
                                                    div.innerHTML = `<span class="font-bold block">${p.name}</span><span class="text-xs text-zinc-500">${p.sku} - $${p.priceNet.toLocaleString()}</span>`;
                                                    div.onclick = () => {
                                                        const form = document.getElementById('add-item-form') as HTMLFormElement;
                                                        if (form) {
                                                            (form.elements.namedItem('sku') as HTMLInputElement).value = p.sku;
                                                            (form.elements.namedItem('detail') as HTMLInputElement).value = p.name;
                                                            (form.elements.namedItem('unit') as HTMLSelectElement).value = p.unit;
                                                            (form.elements.namedItem('priceNet') as HTMLInputElement).value = p.priceNet;
                                                            (form.elements.namedItem('costNet') as HTMLInputElement).value = p.costNet;
                                                            list.style.display = 'none';
                                                        }
                                                    };
                                                    list.appendChild(div);
                                                });
                                            } else {
                                                list.style.display = 'none';
                                            }
                                        }
                                    }}
                                />
                                <div id="search-results" className="absolute z-10 w-full bg-white shadow-xl border border-zinc-200 rounded-lg mt-1 max-h-60 overflow-auto hidden top-full left-0"></div>
                            </div>
                        </div>

                        <div className="md:col-span-2 hidden">
                            <input name="sku" type="hidden" />
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
                                    step="1"
                                    defaultValue="1"
                                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Cantidad mínima: 1')}
                                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                                    className="w-full pl-9 pr-2 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-zinc-500 mb-1" title="Unidad de Medida">Unidad</label>
                            <select
                                name="unit"
                                required
                                defaultValue="UN"
                                className="w-full px-2 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="UN">UN</option>
                                <option value="GL">GL</option>
                                <option value="HR">HR</option>
                                <option value="MT">MT</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Costo Unitario</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                <input name="costNet" type="number" required min="0" placeholder="0" className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Precio Venta</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                <input name="priceNet" type="number" required min="0" placeholder="0" className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
                            </div>
                        </div>

                        <div className="md:col-span-1 flex justify-end">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-[42px] px-6 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg disabled:opacity-50 text-sm font-bold uppercase tracking-wide"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        <Save className="w-5 h-5 mr-2" />
                                        Guardar Ítem
                                    </>
                                )}
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
                    Agregar Ítem
                </button>
            )}
        </div>
    );
}
