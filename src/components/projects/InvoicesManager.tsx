'use client'

import { useState } from "react";
import { Database } from "@/types/supabase";
import { createInvoice, deleteInvoice, markInvoiceSent, registerPayment } from "@/app/actions/invoices";
import { Plus, Trash2, Calendar, FileText, Send, CheckCircle, Clock } from "lucide-react";

type Invoice = Database['public']['Tables']['Invoice']['Row'];

interface Props {
    projectId: string;
    invoices: Invoice[];
}

export function InvoicesManager({ projectId, invoices }: Props) {
    const [isAdding, setIsAdding] = useState(false);

    async function handleCreate(formData: FormData) {
        await createInvoice(projectId, formData);
        setIsAdding(false);
    }

    async function handleMarkSent(id: string) {
        await markInvoiceSent(projectId, id);
    }

    async function handlePay(id: string, currentAmount: number) {
        // Simple full payment for now
        if (confirm("¿Registrar pago total de esta factura?")) {
            await registerPayment(projectId, id, currentAmount);
        }
    }

    async function handleDelete(id: string) {
        if (confirm("¿Eliminar factura?")) await deleteInvoice(projectId, id);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-foreground">Facturación</h3>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                        <tr>
                            <th className="px-6 py-3 font-medium">Estado</th>
                            <th className="px-6 py-3 font-medium">Vencimiento</th>
                            <th className="px-6 py-3 font-medium text-right">Monto</th>
                            <th className="px-6 py-3 font-medium text-right">Pagado</th>
                            <th className="px-6 py-3 font-medium text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {invoices.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                    No hay facturas emitidas.
                                </td>
                            </tr>
                        ) : (
                            invoices.map((inv) => {
                                const isPaid = inv.amountPaidGross >= inv.amountInvoicedGross;
                                return (
                                    <tr key={inv.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <Badge status={isPaid ? 'PAID' : inv.sent ? 'SENT' : 'DRAFT'} />
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-foreground">
                                            ${inv.amountInvoicedGross.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-muted-foreground">
                                            ${inv.amountPaidGross.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end space-x-2">
                                            {!inv.sent && (
                                                <button onClick={() => handleMarkSent(inv.id)} className="p-1 text-blue-600 hover:bg-blue-50/50 rounded" title="Marcar Enviada">
                                                    <Send className="w-4 h-4" />
                                                </button>
                                            )}
                                            {inv.sent && !isPaid && (
                                                <button onClick={() => handlePay(inv.id, inv.amountInvoicedGross)} className="p-1 text-green-600 hover:bg-green-50/50 rounded" title="Registrar Pago">
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(inv.id)} className="p-1 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {isAdding ? (
                <form action={handleCreate} className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-2">
                    <h4 className="text-sm font-medium mb-4">Nueva Factura</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Monto (Bruto)</label>
                            <input name="amount" type="number" required className="w-full px-3 py-2 rounded-lg border text-sm" placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Vencimiento</label>
                            <input name="dueDate" type="date" required className="w-full px-3 py-2 rounded-lg border text-sm" />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={() => setIsAdding(false)} className="text-sm text-zinc-500">Cancelar</button>
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Crear</button>
                    </div>
                </form>
            ) : (
                <button onClick={() => setIsAdding(true)} className="flex items-center text-sm font-medium text-blue-600">
                    <Plus className="w-4 h-4 mr-2" /> Nueva Factura
                </button>
            )}
        </div>
    );
}

function Badge({ status }: { status: 'DRAFT' | 'SENT' | 'PAID' }) {
    const styles = {
        DRAFT: "bg-zinc-100 text-zinc-600 border-zinc-200",
        SENT: "bg-blue-100 text-blue-600 border-blue-200",
        PAID: "bg-green-100 text-green-600 border-green-200"
    };
    const labels = { DRAFT: "Borrador", SENT: "Enviada", PAID: "Pagada" };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
            {labels[status]}
        </span>
    );
}
