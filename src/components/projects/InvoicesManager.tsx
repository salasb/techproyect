'use client'

import { useState } from "react";
import { Database } from "@/types/supabase";
import { createInvoice, deleteInvoice, markInvoiceSent, registerPayment } from "@/app/actions/invoices";
import { closeProject } from "@/app/actions/projects";
import { Plus, Trash2, Calendar, FileText, Send, CheckCircle, Clock, Loader2, DollarSign, X } from "lucide-react";
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
    totalAmount?: number; // Project Gross Budget
}

export function InvoicesManager({
    projectId,
    invoices,
    baseCurrency = 'CLP',
    displayCurrency = 'CLP',
    exchangeRate,
    ufRate,
    totalAmount = 0
}: Props) {
    const [isAdding, setIsAdding] = useState(false);
    const [isLoading, setIsLoading] = useState<string | null>(null); // Stores ID of item being processed
    const [isSubmitting, setIsSubmitting] = useState(false); // For creation form

    // Mark Sent State
    const [markingSentId, setMarkingSentId] = useState<string | null>(null);
    const [sentDate, setSentDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Smart Date Logic
    const [paymentTerms, setPaymentTerms] = useState<number>(30);
    const [dueDate, setDueDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
    });

    const handleTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const days = parseInt(e.target.value) || 0;
        setPaymentTerms(days);

        // Update Date
        const date = new Date();
        date.setDate(date.getDate() + days);
        setDueDate(date.toISOString().split('T')[0]);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDateStr = e.target.value;
        setDueDate(newDateStr);

        // Update Terms
        if (newDateStr) {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = new Date(newDateStr);
            end.setHours(0, 0, 0, 0);

            const diffTime = end.getTime() - start.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setPaymentTerms(diffDays);
        }
    };

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

    // Calculate Remaining logic
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amountInvoicedGross, 0);
    const remainingToInvoice = Math.max(0, totalAmount - totalInvoiced);

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

    async function confirmMarkSent() {
        if (!markingSentId) return;
        setIsLoading(markingSentId);
        toast({ type: 'loading', message: "Marcando como enviada...", duration: 1000 });
        try {
            await markInvoiceSent(projectId, markingSentId, sentDate);
            toast({ type: 'success', message: "Factura marcada como enviada" });
            setMarkingSentId(null);
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
                <div className="text-sm text-muted-foreground">
                    <span className="mr-2">Por facturar:</span>
                    <span className="font-semibold text-foreground">{formatMoney(remainingToInvoice)}</span>
                </div>
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
                                                {inv.sent && inv.sentDate && (
                                                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        {new Date(inv.sentDate).toLocaleDateString()}
                                                    </div>
                                                )}
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
                                                            <button
                                                                onClick={() => {
                                                                    setMarkingSentId(inv.id);
                                                                    setSentDate(new Date().toISOString().split('T')[0]);
                                                                }}
                                                                className="flex items-center text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors"
                                                                title="Registrar Envío"
                                                            >
                                                                <Send className="w-3.5 h-3.5 mr-1.5" />
                                                                Enviada
                                                            </button>
                                                        )}
                                                        {inv.sent && !isPaid && (
                                                            <button
                                                                onClick={() => handlePay(inv.id, inv.amountInvoicedGross)}
                                                                className="flex items-center text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1.5 rounded-md transition-colors"
                                                                title="Registrar Pago Completo"
                                                            >
                                                                <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                                                                Pagada
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleDelete(inv.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors">
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
                            {/* Pre-fill with remaining amount */}
                            <MoneyInput name="amount" required placeholder="0" defaultValue={remainingToInvoice} />
                            <p className="text-[10px] text-muted-foreground mt-1">Sugerido: {formatMoney(remainingToInvoice)}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Vencimiento</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 pointer-events-none" />
                                <input
                                    name="dueDate"
                                    type="date"
                                    required
                                    value={dueDate}
                                    onChange={handleDateChange}
                                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Días de Pago</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 pointer-events-none" />
                                <input
                                    name="paymentTerms"
                                    type="number"
                                    placeholder="30"
                                    value={paymentTerms}
                                    onChange={handleTermsChange}
                                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Calculado automáticamente: {paymentTerms} días desde hoy.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={() => setIsAdding(false)} className="text-sm text-zinc-500 hover:text-zinc-700">Cancelar</button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center disabled:opacity-50 hover:bg-blue-700"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Crear Factura
                        </button>
                    </div>
                </form>
            ) : (
                invoices.length > 0 && (
                    <button onClick={() => setIsAdding(true)} className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
                        <Plus className="w-4 h-4 mr-2" /> Nueva Factura
                    </button>
                )
            )}

            {/* Mark Sent Dialog */}
            {markingSentId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-sm rounded-xl border border-border shadow-lg p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Registrar Envío</h3>
                            <button onClick={() => setMarkingSentId(null)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Indica la fecha en que se envió esta factura al cliente.
                        </p>
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-zinc-500">Fecha de Envío</label>
                            <input
                                type="date"
                                value={sentDate}
                                onChange={(e) => setSentDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setMarkingSentId(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
                            <button
                                onClick={confirmMarkSent}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                            >
                                Confirmar Envío
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
