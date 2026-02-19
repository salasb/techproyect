"use client";

import { useState, useTransition, useMemo } from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Plus, Trash2, ShoppingCart, Loader2, Save, X, Calculator, Hash } from "lucide-react";
import { useRouter } from "next/navigation";
import { createPurchaseOrderAction } from "@/app/actions/procurement";
import { useToast } from "@/components/ui/Toast";

interface Props {
    vendors: any[];
    products: any[];
    projects: any[];
    locations: any[];
}

interface POLine {
    id: string; // Internal unique key for editing
    productId?: string;
    projectId?: string;
    locationId?: string;
    description: string;
    quantity: number;
    priceNet: number;
    taxRate: number;
}

export function POBuilder({ vendors, products, projects, locations }: Props) {
    const [vendorId, setVendorId] = useState<string>("");
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<POLine[]>([{
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        priceNet: 0,
        taxRate: 0.19
    }]);

    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { toast } = useToast();

    // Prepare Options
    const vendorOptions = vendors.map(v => ({ value: v.id, label: v.name }));
    const productOptions = products.map(p => ({ value: p.id, label: `${p.name} (${p.sku || 'S/S'})` }));
    const projectOptions = [{ value: "", label: "No asignar a proyecto" }, ...projects.map(pj => ({ value: pj.id, label: pj.name }))];
    const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));

    const addItem = () => {
        setItems([...items, {
            id: crypto.randomUUID(),
            description: "",
            quantity: 1,
            priceNet: 0,
            taxRate: 0.19
        }]);
    };

    const removeItem = (id: string) => {
        if (items.length === 1) return;
        setItems(items.filter(i => i.id !== id));
    };

    const updateItem = (id: string, field: keyof POLine, value: any) => {
        setItems(items.map(i => {
            if (i.id !== id) return i;

            const updated = { ...i, [field]: value };

            // Auto-populate from product
            if (field === 'productId' && value) {
                const product = products.find(p => p.id === value);
                if (product) {
                    updated.description = product.name;
                    updated.priceNet = product.costNet || 0;
                }
            }

            return updated;
        }));
    };

    // Totals Calculation
    const totals = useMemo(() => {
        let net = 0;
        let tax = 0;
        items.forEach(item => {
            const lineNet = item.priceNet * item.quantity;
            net += lineNet;
            tax += lineNet * item.taxRate;
        });
        return {
            net,
            tax,
            total: net + tax
        };
    }, [items]);

    const handleSubmit = async () => {
        if (!vendorId) {
            toast({ type: 'error', message: "Debes seleccionar un proveedor" });
            return;
        }

        if (items.some(i => !i.description || i.quantity <= 0)) {
            toast({ type: 'error', message: "Revisa los ítems de la orden" });
            return;
        }

        startTransition(async () => {
            try {
                const res = await createPurchaseOrderAction({
                    vendorId,
                    notes,
                    items: items.map(i => ({
                        productId: i.productId || undefined,
                        projectId: i.projectId || undefined,
                        locationId: i.locationId || undefined,
                        description: i.description,
                        quantity: i.quantity,
                        priceNet: i.priceNet,
                        taxRate: i.taxRate
                    }))
                });

                if (res.error) throw new Error(res.error);

                toast({ type: 'success', message: "Orden de Compra creada (Borrador)" });
                router.push(`/purchases/${res.id}`);
            } catch (error: any) {
                toast({ type: 'error', message: error.message || "Error al crear OC" });
            }
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Vendor & General Section */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm ring-1 ring-zinc-200/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground flex items-center gap-2">
                            Proveedor <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                            options={vendorOptions}
                            value={vendorId}
                            onChange={setVendorId}
                            placeholder="Buscar proveedor..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground">Notas Internas / Instrucciones</label>
                        <textarea
                            className="w-full p-3 rounded-xl border border-input bg-background text-sm min-h-[42px] focus:ring-2 focus:ring-primary transition-all"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Opcional..."
                            rows={1}
                        />
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden ring-1 ring-zinc-200/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-bold">Concepto / Producto</th>
                                <th className="px-6 py-4 font-bold">Proyecto / Destino</th>
                                <th className="px-6 py-4 font-bold w-24">Cant.</th>
                                <th className="px-6 py-4 font-bold w-40">Precio Unit. (Neto)</th>
                                <th className="px-6 py-4 font-bold text-right w-40">Total</th>
                                <th className="px-6 py-4 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {items.map((item, idx) => (
                                <tr key={item.id} className="group hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4 space-y-2 align-top">
                                        <SearchableSelect
                                            options={productOptions}
                                            value={item.productId}
                                            onChange={(val) => updateItem(item.id, 'productId', val)}
                                            placeholder="Seleccionar producto catálogo..."
                                            className="w-full"
                                        />
                                        <input
                                            className="w-full p-2 bg-transparent border-b border-dashed border-zinc-200 focus:border-primary outline-none text-sm transition-colors"
                                            placeholder="Descripción detallada del ítem..."
                                            value={item.description}
                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 space-y-2 align-top">
                                        <select
                                            className="w-full p-2 rounded-lg border border-input bg-background text-xs"
                                            value={item.projectId || ""}
                                            onChange={(e) => updateItem(item.id, 'projectId', e.target.value)}
                                        >
                                            {projectOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <select
                                            className="w-full p-2 rounded-lg border border-input bg-background text-xs font-medium"
                                            value={item.locationId || ""}
                                            onChange={(e) => updateItem(item.id, 'locationId', e.target.value)}
                                        >
                                            <option value="">(Sin asignar ubicación)</option>
                                            {locationOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="relative">
                                            <Hash className="absolute left-2 top-2 w-3 h-3 text-zinc-400" />
                                            <input
                                                type="number"
                                                className="w-full pl-6 p-2 rounded-lg border border-input bg-background text-sm text-center font-bold"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                min={1}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="relative font-mono">
                                            <span className="absolute left-2 top-2 text-zinc-400 text-xs">$</span>
                                            <input
                                                type="number"
                                                className="w-full pl-6 p-2 rounded-lg border border-input bg-background text-sm text-right font-bold"
                                                value={item.priceNet}
                                                onChange={(e) => updateItem(item.id, 'priceNet', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right align-top font-mono font-black text-foreground">
                                        ${(item.priceNet * item.quantity).toLocaleString('es-CL')}
                                    </td>
                                    <td className="px-6 py-4 align-top text-center">
                                        {items.length > 1 && (
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-muted/10 border-t border-border">
                            <tr>
                                <td colSpan={6} className="px-6 py-4">
                                    <button
                                        onClick={addItem}
                                        className="flex items-center text-sm font-bold text-primary hover:text-primary/80 transition-colors"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Agregar línea de ítem
                                    </button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Footer / Summary */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-8 bg-zinc-950 text-white p-8 rounded-2xl shadow-2xl border border-zinc-800">
                <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3 text-zinc-400">
                        <Calculator className="w-5 h-5" />
                        <span className="text-sm font-bold uppercase tracking-widest">Resumen de Totales</span>
                    </div>
                    <p className="text-sm text-zinc-500 max-w-sm">
                        La OC se creará en estado <strong>BORRADOR</strong>. Podrás revisarla y enviarla al proveedor en el siguiente paso.
                    </p>
                </div>

                <div className="w-full md:w-80 space-y-4">
                    <div className="flex justify-between text-zinc-400">
                        <span className="text-sm">Total Neto</span>
                        <span className="font-mono font-bold">${totals.net.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                        <span className="text-sm">IVA (19%)</span>
                        <span className="font-mono font-bold">${totals.tax.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="h-px bg-zinc-800 my-2"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-black uppercase text-zinc-500">Total</span>
                        <span className="text-4xl font-black text-white tracking-tighter shadow-blue-500/50">
                            ${totals.total.toLocaleString('es-CL')}
                        </span>
                    </div>

                    <div className="pt-6 flex gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 py-3 px-4 border border-zinc-700 rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isPending}
                            className="flex-[2] py-3 px-6 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center disabled:opacity-50"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            GUARDAR BORRADOR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
