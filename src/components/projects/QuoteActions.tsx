'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateProjectStatus, associateProjectToClient } from "@/app/actions/projects";
import { createInvoiceFromProject } from "@/app/actions/invoices";
import { sendQuoteAction, createQuoteRevisionAction, acceptQuoteAction, rejectQuoteAction } from "@/actions/commercial";
import { QuickClientDialog } from "@/components/clients/QuickClientDialog";
import { useToast } from "@/components/ui/Toast";
import confetti from 'canvas-confetti';
import { Send, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { QuotePdfButton } from "@/components/quotes/QuotePdfButton";

interface QuoteActionsProps {
    projectId: string;
    clientId?: string | null;
    projectStatus: string;
    projectName: string;
    quoteSentDate?: string | null;
    isPaused?: boolean;
    quote?: any;
}

export function QuoteActions({ projectId, clientId, projectStatus, projectName, quoteSentDate, isPaused, quote }: QuoteActionsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleAction = async (action: 'SEND' | 'ACCEPT' | 'REJECT' | 'REVISE') => {
        if (!quote?.id && action !== 'SEND') {
            toast({ 
                type: 'error', 
                message: "Estado Inconsistente: No existe una versión de cotización válida para esta acción. Por favor, genere un borrador primero." 
            });
            return;
        }

        const confirmMsg = {
            'SEND': "¿Enviar cotización al cliente y congelar precios?",
            'ACCEPT': "¿Registrar ACEPTACIÓN MANUAL de la cotización? Esto activará el proyecto.",
            'REJECT': "¿Registrar RECHAZO MANUAL de la cotización? Esto cancelará el proyecto.",
            'REVISE': "¿Crear una nueva versión de revisión basada en esta cotización?"
        }[action];

        if (!confirm(confirmMsg)) return;

        setIsLoading(true);
        try {
            let res: any;
            if (action === 'SEND') {
                res = await sendQuoteAction(quote?.id);
                if (res.success) {
                    const subject = `Cotización ${projectName} - TechWise SpA`;
                    window.open(`mailto:?subject=${encodeURIComponent(subject)}`);
                    toast({ type: 'success', message: "Cotización marcada como ENVIADA." });
                }
            } else if (action === 'ACCEPT') {
                res = await acceptQuoteAction(quote.id);
                if (res.success) {
                    toast({ type: 'success', message: "Aceptación manual registrada. El proyecto ahora está en curso." });
                    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                }
            } else if (action === 'REJECT') {
                res = await rejectQuoteAction(quote.id);
                if (res.success) toast({ type: 'info', message: "Rechazo manual registrado. Proyecto cancelado." });
            } else if (action === 'REVISE') {
                res = await createQuoteRevisionAction(quote.id);
                if (res.success) toast({ type: 'success', message: res.message });
            }

            if (res && !res.success) {
                toast({ 
                    type: 'error', 
                    message: res.error || "La operación no pudo completarse debido al estado actual de la cotización." 
                });
            }
            
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast({ type: 'error', message: error.message || "Error al procesar acción" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateInvoice = async () => {
        if (!confirm("¿Generar factura basada en la cotización actual?")) return;
        setIsLoading(true);
        try {
            const { createInvoiceFromProject } = await import("@/app/actions/invoices");
            await createInvoiceFromProject(projectId);
            toast({ type: 'success', message: "Factura generada exitosamente" });
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast({ type: 'error', message: error.message || "Error al generar factura" });
        } finally {
            setIsLoading(false);
        }
    };

    if (projectStatus === 'CERRADO' || projectStatus === 'CANCELADO') {
        return null;
    }

    const currentStatus = quote?.status || 'NONE';
    const isAccepted = currentStatus === 'ACCEPTED';
    const isRejected = currentStatus === 'REJECTED';
    const isDraft = currentStatus === 'DRAFT';

    return (
        <div className="flex gap-2 print:hidden relative group">
            {isPaused && (
                <div className="absolute inset-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-lg border border-red-200 dark:border-red-900/50 animate-in fade-in zoom-in duration-300">
                    <Link href="/settings/billing" className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline px-2 py-1 bg-white dark:bg-zinc-800 rounded shadow-sm border border-red-100 dark:border-red-900/30 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-pulse" />
                        Reactivar Plan
                    </Link>
                </div>
            )}

            {/* SEND / REVISE Logic */}
            {isDraft ? (
                <button
                    onClick={() => handleAction('SEND')}
                    disabled={isLoading || isPaused}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
                    title="Marcar como enviada y congelar precios"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Enviar al Cliente
                </button>
            ) : (
                !isAccepted && !isRejected && (
                    <button
                        onClick={() => handleAction('REVISE')}
                        disabled={isLoading}
                        className="bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
                        title="Crear nueva versión de revisión"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Revisar Cotización
                    </button>
                )
            )}

            {/* ACCEPTANCE Logic (Manual Override) */}
            {!isAccepted && !isRejected && (
                <>
                    <button
                        onClick={() => handleAction('ACCEPT')}
                        disabled={isLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
                        title="Registrar aceptación manual recibida del cliente"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Aceptar Manual
                    </button>

                    <button
                        onClick={() => handleAction('REJECT')}
                        disabled={isLoading}
                        className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
                        title="Registrar rechazo manual del cliente"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                        Rechazar Manual
                    </button>
                </>
            )}

            {quote && (
                <div className="flex items-center h-10 px-2 bg-white rounded-lg border border-zinc-200 shadow-sm">
                    <QuotePdfButton quote={quote} />
                </div>
            )}

            {/* Success Actions */}
            {isAccepted && projectStatus === 'EN_CURSO' && (
                <button
                    onClick={handleGenerateInvoice}
                    disabled={isLoading}
                    className="ml-2 bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center animate-in fade-in"
                    title="Crear borrador contable de factura basado en cotización aceptada"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Preparar Borrador Factura
                </button>
            )}

            <QuickClientDialog
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onClientCreated={async (client) => {
                    try {
                        setIsLoading(true);
                        await associateProjectToClient(projectId, client.id);
                        toast({ type: 'success', message: "Cliente asociado. Procediendo a enviar..." });
                        await handleAction('SEND');
                    } catch (err: any) {
                        toast({ type: 'error', message: err.message });
                    } finally {
                        setIsLoading(false);
                    }
                }}
            />
        </div>
    );
}
