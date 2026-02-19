"use client";

import { useState, useTransition } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    ArrowLeft,
    Printer,
    Download,
    Truck,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Send,
    Plus,
    History,
    Package
} from "lucide-react";
import Link from "next/link";
import { updatePurchaseOrderStatusAction, cancelPurchaseOrderAction } from "@/app/actions/procurement";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ReceivePOModal } from "./ReceivePOModal";
import { PurchaseOrderStatus } from "@prisma/client";

interface Props {
    po: any;
    locations: any[];
}

export function PODetailView({ po, locations }: Props) {
    const [isUpdating, startTransition] = useTransition();
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const { toast } = useToast();

    const canReceive = ["SENT", "APPROVED", "PARTIALLY_RECEIVED"].includes(po.status);
    const canCancel = ["DRAFT", "SENT", "APPROVED"].includes(po.status);

    const handleStatusUpdate = async (newStatus: string) => {
        startTransition(async () => {
            try {
                const res = await updatePurchaseOrderStatusAction(po.id, newStatus as PurchaseOrderStatus);
                if (res.error) throw new Error(res.error);
                toast({ type: 'success', message: `Estado actualizado a ${newStatus}` });
            } catch (error: any) {
                toast({ type: 'error', message: error.message });
            }
        });
    };

    const handleCancel = async () => {
        startTransition(async () => {
            try {
                const res = await cancelPurchaseOrderAction(po.id);
                if (res.error) throw new Error(res.error);
                toast({ type: 'success', message: "Orden de Compra cancelada" });
                setIsCancelDialogOpen(false);
            } catch (error: any) {
                toast({ type: 'error', message: error.message });
            }
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/purchases"
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black tracking-tight text-foreground">
                                OC #{po.poNumber || po.id.slice(0, 8)}
                            </h1>
                            <StatusBadge status={po.status} type="PURCHASE_ORDER" />
                        </div>
                        <p className="text-muted-foreground text-sm font-medium">
                            Creada el {format(new Date(po.createdAt), "PPP", { locale: es })}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {po.status === 'DRAFT' && (
                        <button
                            onClick={() => handleStatusUpdate('SENT')}
                            disabled={isUpdating}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            Marcar como Enviada
                        </button>
                    )}

                    {canReceive && (
                        <button
                            onClick={() => setIsReceiveModalOpen(true)}
                            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                        >
                            <Truck className="w-4 h-4 mr-2" />
                            Recibir Ítems
                        </button>
                    )}

                    {canCancel && (
                        <button
                            onClick={() => setIsCancelDialogOpen(true)}
                            className="flex items-center px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-bold hover:bg-red-100 transition-all"
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancelar OC
                        </button>
                    )}

                    <button className="p-2 border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                        <Printer className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Items Section */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-muted/20">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Plus className="w-5 h-5 text-primary" />
                                Ítems de la Orden
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">Descripción</th>
                                        <th className="px-6 py-4 font-bold text-center">Cant. OC</th>
                                        <th className="px-6 py-4 font-bold text-center">Recibido</th>
                                        <th className="px-6 py-4 font-bold text-right">Unitario</th>
                                        <th className="px-6 py-4 font-bold text-right">Total Neto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {po.items.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-foreground">{item.description}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {item.product?.sku || 'S/S'} • {item.project?.name || 'General'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-foreground">
                                                {item.quantity} {item.product?.unit || 'UN'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.receivedQuantity >= item.quantity
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : item.receivedQuantity > 0
                                                            ? 'bg-amber-50 text-amber-600'
                                                            : 'bg-zinc-100 text-zinc-500'
                                                        }`}>
                                                        {item.receivedQuantity} / {item.quantity}
                                                    </span>
                                                    {item.location && (
                                                        <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tighter">
                                                            📍 {item.location.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-zinc-600">
                                                ${item.priceNet.toLocaleString('es-CL')}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-black text-foreground">
                                                ${(item.priceNet * item.quantity).toLocaleString('es-CL')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Reception History */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <History className="w-5 h-5 text-primary" />
                                Historial de Recepciones
                            </h2>
                            <span className="text-xs font-bold bg-zinc-100 px-2 py-1 rounded-md text-zinc-500 uppercase tracking-tighter">
                                {po.receipts?.length || 0} Registros
                            </span>
                        </div>
                        {po.receipts && po.receipts.length > 0 ? (
                            <div className="divide-y divide-border">
                                {po.receipts.map((receipt: any) => (
                                    <div key={receipt.id} className="p-6 hover:bg-muted/5 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-foreground">
                                                        Recibo #{receipt.receiptNumber}
                                                    </span>
                                                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase">
                                                        Procesado
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Recibido el {format(new Date(receipt.createdAt), "PPP p", { locale: es })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-foreground">Bodega: {receipt.location?.name || 'N/A'}</div>
                                                <div className="text-[10px] text-muted-foreground">Por: {receipt.receivedBy?.name || 'Sistema'}</div>
                                            </div>
                                        </div>

                                        {/* Items in this receipt */}
                                        <div className="bg-muted/30 rounded-lg p-3">
                                            <ul className="space-y-2">
                                                {receipt.items.map((ri: any) => (
                                                    <li key={ri.id} className="flex justify-between items-center text-xs">
                                                        <span className="text-muted-foreground font-medium">• {ri.purchaseOrderItem?.description || 'Item'}</span>
                                                        <span className="font-black text-foreground">{ri.quantity} UN</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {receipt.notes && (
                                            <p className="mt-3 text-xs text-muted-foreground italic bg-zinc-50 p-2 rounded border-l-2 border-zinc-200">
                                                "{receipt.notes}"
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-muted-foreground">
                                <Package className="w-12 h-12 mx-auto mb-4 text-zinc-200" />
                                <p className="text-sm font-medium">No hay recepciones registradas para esta orden.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Totals Widget */}
                    <div className="bg-zinc-950 text-white rounded-2xl p-6 shadow-xl border border-zinc-800 space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Resumen Financiero</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Neto</span>
                                <span className="font-mono font-bold">${po.totalNeto.toLocaleString('es-CL')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">IVA (19%)</span>
                                <span className="font-mono font-bold">${po.totalIva.toLocaleString('es-CL')}</span>
                            </div>
                            <div className="h-px bg-zinc-800 my-2"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-black uppercase text-zinc-500 tracking-tighter">Total Gross</span>
                                <span className="text-3xl font-black text-white tracking-tighter">
                                    ${po.totalBruto.toLocaleString('es-CL')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Vendor Info */}
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Proveedor</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm font-bold text-foreground underline decoration-primary decoration-2 underline-offset-4">{po.vendor?.name}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-1">{po.vendor?.taxId}</p>
                            </div>
                            <div className="text-xs space-y-1">
                                <p className="flex items-center gap-2">📧 {po.vendor?.email || 'No disponible'}</p>
                                <p className="flex items-center gap-2">📞 {po.vendor?.phone || 'No disponible'}</p>
                                <p className="flex items-center gap-2 mt-2 pt-2 border-t border-border">📍 {po.vendor?.address || 'No disponible'}</p>
                            </div>
                        </div>
                        <Link
                            href={`/vendors?id=${po.vendor?.id}`}
                            className="block w-full py-2 text-center text-xs font-bold bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                        >
                            Ver Ficha Proveedor
                        </Link>
                    </div>

                    {/* Notes */}
                    {po.notes && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-2">Notas Internas</h3>
                            <p className="text-sm text-amber-800 dark:text-amber-300 italic">"{po.notes}"</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <ReceivePOModal
                isOpen={isReceiveModalOpen}
                onClose={() => setIsReceiveModalOpen(false)}
                po={po}
                locations={locations}
            />

            <ConfirmDialog
                isOpen={isCancelDialogOpen}
                title="Cancelar Orden de Compra"
                description="¿Estás seguro que deseas cancelar esta OC? Esta acción no se puede deshacer y liberará los compromisos de compra."
                confirmText="Sí, Cancelar OC"
                variant="danger"
                isLoading={isUpdating}
                onConfirm={handleConfirmDelete} // Fixed name below
                onCancel={() => setIsCancelDialogOpen(false)}
            />
        </div>
    );

    async function handleConfirmDelete() {
        handleCancel();
    }
}
