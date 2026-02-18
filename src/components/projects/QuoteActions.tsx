'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateProjectStatus, associateProjectToClient } from "@/app/actions/projects";
import { createInvoiceFromProject } from "@/app/actions/invoices";
import { sendQuote, createQuoteRevision, toggleQuoteAcceptance } from "@/app/actions/quotes";
import { QuickClientDialog } from "@/components/clients/QuickClientDialog";
import { useToast } from "@/components/ui/Toast";
import confetti from 'canvas-confetti';
import { Send, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";

interface QuoteActionsProps {
    projectId: string;
    clientId?: string | null;
    projectStatus: string;
    projectName: string;
    quoteSentDate?: string | null;
    isPaused?: boolean;
}

export function QuoteActions({ projectId, clientId, projectStatus, projectName, quoteSentDate, isPaused }: QuoteActionsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleAction = async (action: 'SEND' | 'ACCEPT' | 'REJECT' | 'REVISE') => {
        if (action === 'SEND' && !clientId) {
            setIsClientModalOpen(true);
            return;
        }

        if (!confirm("¿Está seguro de realizar esta acción?")) return;

        setIsLoading(true);
        try {
            if (action === 'SEND') {
                await sendQuote(projectId);

                const subject = `Cotización ${projectName} - TechWise SpA`;
                const body = `Estimado cliente,\n\nAdjunto encontrará la cotización para el proyecto reference.\n\nQuedamos atentos.\n\nSaludos,\nChristian Salas\nTechWise SpA`;
                window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);

                toast({ type: 'success', message: "Cotización enviada y Snapshot v1 creado" });
            } else if (action === 'ACCEPT') {
                await toggleQuoteAcceptance(projectId, true);
                toast({ type: 'success', message: "¡Proyecto Aceptado! Estado: En Curso" });
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            } else if (action === 'REJECT') {
                await updateProjectStatus(projectId, 'CANCELADO');
                toast({ type: 'info', message: "Proyecto marcado como Cancelado" });
            } else if (action === 'REVISE') {
                await createQuoteRevision(projectId);
                toast({ type: 'success', message: `Nueva versión de revisión creada exitosamente.` });
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
        return null; // Actions not available for final states
    }

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
            {!quoteSentDate ? (
                <button
                    onClick={() => handleAction('SEND')}
                    disabled={isLoading || isPaused}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
                    title="Enviar Cotización (Congela versión actual)"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Enviar
                </button>
            ) : (
                <button
                    onClick={() => handleAction('REVISE')}
                    disabled={isLoading}
                    className="bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
                    title="Crear Nueva Versión de Revisión"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Revisar (vN+1)
                </button>
            )}

            <button
                onClick={() => handleAction('ACCEPT')}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
                title="Aceptar Cotización (Cambia estado a En Curso)"
            >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Aceptar
            </button>

            <button
                onClick={() => handleAction('REJECT')}
                disabled={isLoading}
                className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
                title="Rechazar Cotización"
            >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                Rechazar
            </button>

            {/* Invoice Generation - Available when Accepted (En Curso) */}
            {projectStatus === 'EN_CURSO' && (
                <button
                    onClick={handleGenerateInvoice}
                    disabled={isLoading}
                    className="ml-2 bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center animate-in fade-in"
                    title="Generar Factura desde Cotización"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Generar Factura
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
                        // Re-trigger SEND now that we have a client
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
