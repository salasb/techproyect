'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProjectStatus } from "@/app/actions/projects";
import { useToast } from "@/components/ui/Toast";
import confetti from 'canvas-confetti';
import { Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface QuoteActionsProps {
    projectId: string;
    projectStatus: string;
    projectName: string;
    quoteSentDate?: string | null;
}

export function QuoteActions({ projectId, projectStatus, projectName, quoteSentDate }: QuoteActionsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleAction = async (action: 'SEND' | 'ACCEPT' | 'REJECT') => {
        if (!confirm("¿Está seguro de realizar esta acción?")) return;

        setIsLoading(true);
        try {
            if (action === 'SEND') {
                await updateProjectStatus(projectId, 'EN_ESPERA', 'COTIZACION', 'Seguimiento Cotización');

                const subject = `Cotización ${projectName} - TechWise SpA`;
                const body = `Estimado cliente,\n\nAdjunto encontrará la cotización para el proyecto reference.\n\nQuedamos atentos.\n\nSaludos,\nChristian Salas\nTechWise SpA`;
                window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);

                toast({ type: 'success', message: "Estado actualizado a En Espera" });
            } else if (action === 'ACCEPT') {
                await updateProjectStatus(projectId, 'EN_CURSO', 'DISENO', 'Iniciar Desarrollo');
                toast({ type: 'success', message: "¡Proyecto Aceptado! Estado: En Curso" });
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            } else if (action === 'REJECT') {
                await updateProjectStatus(projectId, 'CANCELADO');
                toast({ type: 'info', message: "Proyecto marcado como Cancelado" });
            }
            router.refresh();
            router.push(`/projects/${projectId}`); // Redirect back to project to see changes
        } catch (error) {
            console.error(error);
            toast({ type: 'error', message: "Error al actualizar estado" });
        } finally {
            setIsLoading(false);
        }
    };

    if (projectStatus === 'FINALIZADO' || projectStatus === 'CANCELADO' || projectStatus === 'EN_CURSO') {
        return null; // Actions not available for final states or already accepted
    }

    return (
        <div className="flex gap-2 print:hidden">
            {!quoteSentDate && (
                <button
                    onClick={() => handleAction('SEND')}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
                    title="Enviar Cotización (Cambia estado a En Espera)"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Enviar
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
        </div>
    );
}
