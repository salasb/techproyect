"use client";

import { useState, useTransition, useMemo } from "react";
import {
    X,
    Truck,
    Package,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    MapPin,
    Hash
} from "lucide-react";
import { receivePurchaseOrderAction } from "@/app/actions/procurement";
import { useToast } from "@/components/ui/Toast";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    po: any;
    locations: any[];
}

export function ReceivePOModal({ isOpen, onClose, po, locations }: Props) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // State for reception quantities
    // We only show items that are NOT fully received
    const receivableItems = useMemo(() => {
        return po.items.filter((item: any) => item.receivedQuantity < item.quantity);
    }, [po.items]);

    const [receptionData, setReceptionData] = useState<Record<string, { quantity: number }>>({});
    const [receiptNumber, setReceiptNumber] = useState("");
    const [receivedNotes, setReceivedNotes] = useState("");
    const [targetLocationId, setTargetLocationId] = useState(po.items[0]?.locationId || (locations[0]?.id || ""));

    // Initialize state when modal opens
    useMemo(() => {
        if (!isOpen) return;
        const initial: Record<string, { quantity: number }> = {};
        receivableItems.forEach((item: any) => {
            initial[item.id] = {
                quantity: item.quantity - item.receivedQuantity,
            };
        });
        setReceptionData(initial);
        setReceiptNumber("");
        setReceivedNotes("");
    }, [isOpen, receivableItems]);

    if (!isOpen) return null;

    const handleUpdateQuantity = (itemId: string, qty: number) => {
        const item = receivableItems.find((i: any) => i.id === itemId);
        if (!item) return;

        const remaining = item.quantity - item.receivedQuantity;
        const finalizedQty = Math.max(0, Math.min(qty, remaining));

        setReceptionData(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], quantity: finalizedQty }
        }));
    };

    const handleUpdateLocation = (itemId: string, locId: string) => {
        setReceptionData(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], locationId: locId }
        }));
    };

    const handleReceive = async () => {
        if (!receiptNumber.trim()) {
            toast({ type: 'error', message: "Debes ingresar un Número de Recibo o Factura" });
            return;
        }

        if (!targetLocationId) {
            toast({ type: 'error', message: "Debes seleccionar una ubicación de destino" });
            return;
        }

        // Filter out items with 0 quantity
        const lines = Object.entries(receptionData)
            .filter(([_, data]) => data.quantity > 0)
            .map(([itemId, data]) => ({
                itemId,
                quantity: data.quantity,
            }));

        if (lines.length === 0) {
            toast({ type: 'error', message: "No hay ítems con cantidad válida para recibir" });
            return;
        }

        startTransition(async () => {
            try {
                const res = await receivePurchaseOrderAction({
                    poId: po.id,
                    receiptNumber: receiptNumber,
                    locationId: targetLocationId,
                    notes: receivedNotes,
                    lines: lines
                });
                if (res.error) throw new Error(res.error);

                toast({ type: 'success', message: "Recepción procesada correctamente" });
                onClose();
            } catch (error: any) {
                toast({ type: 'error', message: error.message || "Error al recibir ítems" });
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-950 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-border animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                            <Truck className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Recepción de OC #{po.poNumber || po.id.slice(0, 8)}</h2>
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Mueve ítems al inventario</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Header counts or info could go here */}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {receivableItems.length === 0 ? (
                        <div className="p-12 text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-bold">¡Todo Recibido!</h3>
                            <p className="text-muted-foreground">Ya no quedan ítems pendientes en esta orden de compra.</p>
                            <button onClick={onClose} className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold">Cerrar</button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Receipt Data Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-zinc-500">Número de Recibo / Factura</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                        <input
                                            type="text"
                                            placeholder="Ej: FAC-12345"
                                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:ring-2 focus:ring-primary outline-none"
                                            value={receiptNumber}
                                            onChange={(e) => setReceiptNumber(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-zinc-500">Bodega de Destino (Global)</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                                        <select
                                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:ring-2 focus:ring-primary outline-none appearance-none"
                                            value={targetLocationId}
                                            onChange={(e) => setTargetLocationId(e.target.value)}
                                        >
                                            <option value="">(Seleccionar ubicación...)</option>
                                            {locations.map(loc => (
                                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-black uppercase text-zinc-500">Notas de Recepción (Opcional)</label>
                                    <textarea
                                        placeholder="Observaciones sobre el estado de los productos..."
                                        className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:ring-2 focus:ring-primary outline-none min-h-[60px]"
                                        value={receivedNotes}
                                        onChange={(e) => setReceivedNotes(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="space-y-3">
                                <div className="grid grid-cols-12 gap-4 text-[10px] font-black uppercase text-muted-foreground px-4 mb-2">
                                    <div className="col-span-8">Ítem / Producto</div>
                                    <div className="col-span-2 text-center">Pendiente</div>
                                    <div className="col-span-2 text-right">A Recibir</div>
                                </div>

                                {receivableItems.map((item: any) => {
                                    const remaining = item.quantity - item.receivedQuantity;
                                    const data = receptionData[item.id] || { quantity: 0 };

                                    return (
                                        <div key={item.id} className="grid grid-cols-12 gap-4 items-center p-4 rounded-xl border border-zinc-100 bg-white hover:bg-zinc-50 transition-colors">
                                            <div className="col-span-8">
                                                <p className="text-sm font-bold text-foreground">{item.description}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Package className="w-3 h-3 text-zinc-400" />
                                                    <span className="text-[10px] text-muted-foreground font-mono">{item.product?.sku || 'S/S'}</span>
                                                </div>
                                            </div>

                                            <div className="col-span-2 text-center">
                                                <span className="text-sm font-black text-zinc-400">{remaining}</span>
                                            </div>

                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    className="w-full p-2 rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-right font-black focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    value={data.quantity}
                                                    onChange={(e) => handleUpdateQuantity(item.id, parseFloat(e.target.value) || 0)}
                                                    min={0}
                                                    max={remaining}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {receivableItems.length > 0 && (
                    <div className="px-6 py-4 border-t border-border bg-zinc-50 dark:bg-zinc-900/50 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                            <AlertTriangle className="w-4 h-4" />
                            <p className="text-[11px] font-medium max-w-xs leading-tight">
                                Al procesar, se crearán movimientos de entrada (IN) y se imputarán costos a los proyectos correspondientes.
                            </p>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button
                                onClick={onClose}
                                className="flex-1 md:flex-none px-6 py-2 border border-border rounded-xl text-sm font-bold hover:bg-muted transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReceive}
                                disabled={isPending}
                                className="flex-1 md:flex-none px-8 py-2 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center disabled:opacity-50"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Recepción"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
