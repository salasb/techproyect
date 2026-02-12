'use client'

import { useState } from "react";
import { Database } from "@/types/supabase";
import { createInvoice, deleteInvoice, markInvoiceSent, registerPayment } from "@/app/actions/invoices";
import { closeProject } from "@/app/actions/projects";
import { Plus, Trash2, Calendar, FileText, Send, CheckCircle, Clock, Loader2 } from "lucide-react";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Invoice = Database['public']['Tables']['Invoice']['Row'];

interface Props {
    projectId: string;
    invoices: Invoice[];
    baseCurrency?: string;
    displayCurrency?: string;
    exchangeRate?: { value: number };
    ufRate?: { value: number };
}

export function InvoicesManager({
    projectId,
    invoices,
    baseCurrency = 'CLP',
    displayCurrency = 'CLP',
    exchangeRate,
    ufRate
}: Props) {
    const [isAdding, setIsAdding] = useState(false);
    const [isLoading, setIsLoading] = useState<string | null>(null); // Stores ID of item being processed
    const [isSubmitting, setIsSubmitting] = useState(false); // For creation form

    const { toast } = useToast();

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

    async function handleCreate(formData: FormData) {
        setIsSubmitting(true);
        toast({ type: 'loading', message: "Creando factura...", duration: 2000 });
        try {
            await createInvoice(projectId, formData);
            toast({ type: 'success', message: "Factura creada correctamente" });
            setIsAdding(false);
        } catch (error) {
            toast({ type: 'error', message: "Error al crear factura" });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleMarkSent(id: string) {
        setIsLoading(id);
        toast({ type: 'loading', message: "Marcando como enviada...", duration: 1000 });
        try {
            await markInvoiceSent(projectId, id);
            toast({ type: 'success', message: "Factura marcada como enviada" });
        } catch (error) {
            toast({ type: 'error', message: "Error al actualizar estado" });
        } finally {
            setIsLoading(null);
        }
    }

    async function handlePay(id: string, currentAmount: number) {
        // Simple full payment for now
        if (confirm("¿Registrar pago total de esta factura?")) {
            setIsLoading(id);
            toast({ type: 'loading', message: "Registrando pago...", duration: 2000 });
            try {
                const res = await registerPayment(projectId, id, currentAmount);
                toast({ type: 'success', message: "Pago registrado exitosamente" });

                if (res?.isFullyPaid) {
                    // Determine if we should prompt
                    if (confirm("El proyecto ha sido pagado en su totalidad. ¿Deseas cerrar el proyecto y marcarlo como Finalizado?")) {
                        await closeProject(projectId);
                        toast({ type: 'success', message: "Proyecto finalizado" });
                    }
                }
            } catch (error) {
                toast({ type: 'error', message: "Error al registrar pago" });
            } finally {
                setIsLoading(null);
            }
        }
    }

    async function handleDelete(id: string) {
        if (confirm("¿Eliminar factura?")) {
            setIsLoading(id);
            try {
                await deleteInvoice(projectId, id);
                toast({ type: 'success', message: "Factura eliminada" });
            } catch (error) {
                toast({ type: 'error', message: "Error al eliminar factura" });
            } finally {
                setIsLoading(null);
            }
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-foreground">Facturación</h3>
            </div>

            {invoices.length > 0 ? (
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <div className="overflow-x-auto">
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
                                {invoices.map((inv) => {
                                    const isPaid = inv.amountPaidGross >= inv.amountInvoicedGross;
                                    const isProcessing = isLoading === inv.id;

                                    return (
                                        <tr key={inv.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <StatusBadge status={isPaid ? 'PAID' : inv.sent ? 'SENT' : 'DRAFT'} type="INVOICE" />
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-foreground">
                                                {formatMoney(inv.amountInvoicedGross)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-muted-foreground">
                                                {formatMoney(inv.amountPaidGross)}
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end space-x-2">
                                                {isProcessing ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                ) : (
                                                    <>
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
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                !isAdding && (
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-4">No hay facturas emitidas.</p>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Factura
                        </button>
                    </div>
                )
            )}

            {isAdding ? (
                <form action={handleCreate} className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top-2">
                    <h4 className="text-sm font-medium mb-4">Nueva Factura</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Monto (Bruto)</label>
                            <MoneyInput name="amount" required placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Vencimiento</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 pointer-events-none" />
                                <input
                                    name="dueDate"
                                    type="date"
                                    required
                                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={() => setIsAdding(false)} className="text-sm text-zinc-500">Cancelar</button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center disabled:opacity-50"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Crear
                        </button>
                    </div>
                </form>
            ) : (
                invoices.length > 0 && (
                    <button onClick={() => setIsAdding(true)} className="flex items-center text-sm font-medium text-blue-600">
                        <Plus className="w-4 h-4 mr-2" /> Nueva Factura
                    </button>
                )
            )}
        </div>
    );
}


