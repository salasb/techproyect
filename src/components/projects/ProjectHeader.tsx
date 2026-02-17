'use client'

import { useState } from "react";
import { Database } from "@/types/supabase";
import { updateProjectSettings } from "@/app/actions/project-settings";
import { createAuditLog } from "@/actions/audit";
import { addLog } from "@/actions/project-logs";
import { AlertCircle, Lock, Unlock, Clock, FileText, ChevronDown, Eye, Download, Send, Calendar } from "lucide-react";
import { differenceInCalendarDays, isBefore, startOfDay, addDays, format } from "date-fns";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/Toast";

type Project = Database['public']['Tables']['Project']['Row'];
type Company = Database['public']['Tables']['Company']['Row'];

interface Props {
    project: Project & { company: Company; client?: Database['public']['Tables']['Client']['Row'] | null };
}

export function ProjectHeader({ project }: Props) {
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [isQuoteMenuOpen, setIsQuoteMenuOpen] = useState(false);

    // Alert Logic
    const today = new Date();
    const nextActionDate = project.nextActionDate ? new Date(project.nextActionDate) : null;
    const isOverdue = nextActionDate && isBefore(startOfDay(nextActionDate), startOfDay(today));
    const isDueToday = nextActionDate && differenceInCalendarDays(nextActionDate, today) === 0;

    // Quote Sent Logic
    const quoteSentDate = project.quoteSentDate ? new Date(project.quoteSentDate) : null;
    const daysSinceQuoteSent = quoteSentDate ? differenceInCalendarDays(today, quoteSentDate) : 0;
    const showQuoteFollowUp = quoteSentDate && daysSinceQuoteSent >= 5 && project.stage === 'LEVANTAMIENTO'; // Only if still in early stage

    const { toast } = useToast();

    async function handleMarkQuoteSent() {
        const now = new Date().toISOString();
        const nextFollowUp = addDays(new Date(), 5).toISOString(); // Auto-set next action

        await updateProjectSettings(project.id, {
            quoteSentDate: now,
            nextAction: "Seguimiento Cotización",
            nextActionDate: nextFollowUp
        });

        // Log the action
        await createAuditLog(
            project.id,
            "COTIZACION_ENVIADA",
            "Estado actualizado a 'Seguimiento Cotización'",
            "Sistema"
        );

        // Add visual log to Bitácora (Timeline)
        await addLog(
            project.id,
            "Cotización enviada al cliente formalmente.",
            "MILESTONE"
        );

        // Update status to 'EN_ESPERA' (Waiting for Client)
        if (project.status === 'EN_CURSO') {
            await updateProjectSettings(project.id, {
                status: 'EN_ESPERA'
            });
        }

        toast({ type: 'success', message: "Cotización marcada como enviada exitosamente" });

        // Small delay to allow toast to be seen before reload (or ideally use router.refresh)
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }

    async function handleDismissFollowUp() {
        await updateProjectSettings(project.id, {
            quoteSentDate: null, // Clear it or mark as done? Clearing stops the alert.
            nextAction: "Cotización Revisada / Esperando Respuesta"
        });
        window.location.reload();
    }

    async function handleStatusChange(newStatus: string) {
        // CLOSE_REASONS Enum Mapping
        const REASONS = [
            { id: 'PRICE', label: 'Precio (Muy Caro)' },
            { id: 'COMPETITION', label: 'Competencia (Perdimos vs otro)' },
            { id: 'DELAY', label: 'Plazo (Tardamos mucho)' },
            { id: 'SCOPE', label: 'Alcance (No cubrimos lo pedido)' },
            { id: 'DISCARDED', label: 'Descartado (El cliente no siguió)' },
            { id: 'OTHER', label: 'Otro' }
        ];

        let closeReason: string | undefined;

        if (newStatus === 'CERRADO' || newStatus === 'CANCELADO') {
            const reasonLines = REASONS.map((r, i) => `${i + 1}. ${r.label}`).join('\n');
            const selection = prompt(`Seleccione la razón del cierre:\n${reasonLines}\n(Ingrese el número o texto):`);

            if (!selection) return; // Cancelled status change

            // Try to match index or text
            const index = parseInt(selection) - 1;
            if (index >= 0 && index < REASONS.length) {
                closeReason = REASONS[index].id;
            } else {
                // Try to find by ID/Label or default to OTHER
                const found = REASONS.find(r => r.id === selection.toUpperCase() || r.label.toLowerCase().includes(selection.toLowerCase()));
                closeReason = found ? found.id : 'OTHER';
            }
        }

        let blockingReason = project.blockingReason;
        if (newStatus === 'BLOQUEADO') {
            const reason = prompt("Motivo del bloqueo (Requerido):", project.blockingReason || "");
            if (!reason) return;
            blockingReason = reason;
        } else {
            blockingReason = null;
        }

        // 2. Update via action
        await updateProjectSettings(project.id, {
            status: newStatus as any,
            blockingReason,
            closeReason: closeReason as any
        } as any);

        // 3. Log to Bitácora
        const statusLabel = newStatus.replace('_', ' ');
        const logContent = closeReason
            ? `Estado cambiado a '${statusLabel}'. Razón Comercial: ${REASONS.find(r => r.id === closeReason)?.label}`
            : (blockingReason ? `Estado bloqueado. Motivo: ${blockingReason}` : `Estado actualizado a '${statusLabel}'.`);

        await addLog(project.id, logContent, newStatus === 'BLOQUEADO' ? 'BLOCKER' : 'STATUS_CHANGE');

        setIsEditingStatus(false);
        toast({ type: 'success', message: "Estado actualizado correctamente" });
        window.location.reload();
    }

    return (
        <div className="space-y-4">
            {/* Quote Follow-up Alert */}
            {showQuoteFollowUp && (
                <div className="p-4 rounded-lg flex items-start space-x-3 bg-blue-50 text-blue-700 border border-blue-200 animate-in slide-in-from-top-2">
                    <Calendar className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="font-semibold text-sm">Seguimiento de Cotización</h4>
                        <p className="text-sm mt-1">
                            Se envió la cotización hace <span className="font-bold">{daysSinceQuoteSent} días</span>. Es recomendable contactar al cliente.
                        </p>
                    </div>
                    <button
                        onClick={handleDismissFollowUp}
                        className="text-xs underline hover:no-underline font-medium text-blue-800"
                    >
                        Descartar
                    </button>
                </div>
            )}

            {/* Alerts Banner */}
            {(isOverdue || isDueToday) && (
                <div className={`p-4 rounded-lg flex items-start space-x-3 ${isOverdue ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="font-semibold text-sm">Próxima Acción Pendiente</h4>
                        <p className="text-sm mt-1">
                            {project.nextAction || "Sin descripción"}
                            <span className="font-mono ml-2 opacity-75">
                                ({nextActionDate?.toLocaleDateString()})
                            </span>
                        </p>
                    </div>
                    <button
                        onClick={async () => {
                            const action = prompt("Actualizar próxima acción:", project.nextAction || "");
                            if (action) {
                                await updateProjectSettings(project.id, { nextAction: action });
                                window.location.reload();
                            }
                        }}
                        className="text-xs underline hover:no-underline font-medium"
                    >
                        Actualizar
                    </button>
                </div>
            )}

            {/* Blocked Banner */}
            {project.status === 'BLOQUEADO' && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start space-x-3">
                    <Lock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-sm text-orange-800">Proyecto Bloqueado</h4>
                        <p className="text-sm text-orange-700 mt-1">
                            Motivo: <span className="font-medium italic">"{project.blockingReason}"</span>
                        </p>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-1">
                        <span>{project.client?.name || project.company.name}</span>
                        <span>/</span>
                        <span title="Folio Interno">Folio: #{project.id ? project.id.slice(0, 8).toUpperCase() : 'N/A'}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
                    <div className="flex items-center space-x-2 mt-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div><StatusBadge status={project.status} onClick={() => setIsEditingStatus(!isEditingStatus)} /></div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Haz clic para cambiar el estado</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            {project.stage}
                        </span>

                        {quoteSentDate && (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 animate-in fade-in">
                                <Send className="w-3 h-3" />
                                Enviada: {format(quoteSentDate, 'dd/MM/yy')}
                            </span>
                        )}
                    </div>

                    {isEditingStatus && (
                        <div className="mt-2 p-2 bg-popover border border-border rounded-lg shadow-lg absolute z-10 animate-in fade-in zoom-in-95">
                            <div className="grid grid-cols-1 gap-1 w-40">
                                {['EN_ESPERA', 'EN_CURSO', 'BLOQUEADO', 'CERRADO', 'CANCELADO'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => handleStatusChange(s)}
                                        className="text-left px-3 py-2 text-sm hover:bg-muted rounded text-foreground"
                                    >
                                        {s.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex space-x-3">
                    <div className="relative">
                        <button
                            onClick={() => setIsQuoteMenuOpen(!isQuoteMenuOpen)}
                            className="flex items-center space-x-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                            <FileText className="w-4 h-4" />
                            <span>Generar Cotización</span>
                            <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
                        </button>

                        {isQuoteMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-20 overflow-hidden animate-in fade-in zoom-in-95">
                                <div className="p-1">
                                    <Link
                                        href={`/projects/${project.id}/quote`}
                                        target="_blank"
                                        className="flex items-center w-full px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg group"
                                        onClick={() => setIsQuoteMenuOpen(false)}
                                    >
                                        <Eye className="w-4 h-4 mr-2 text-blue-500 group-hover:text-blue-600" />
                                        <span>Visualizar</span>
                                    </Link>
                                    <Link
                                        href={`/projects/${project.id}/quote?print=true`}
                                        target="_blank"
                                        className="flex items-center w-full px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg group"
                                        onClick={() => setIsQuoteMenuOpen(false)}
                                    >
                                        <Download className="w-4 h-4 mr-2 text-green-500 group-hover:text-green-600" />
                                        <span>Descargar (PDF)</span>
                                    </Link>
                                    <button
                                        onClick={() => {
                                            if (!quoteSentDate) {
                                                handleMarkQuoteSent();
                                                setIsQuoteMenuOpen(false);
                                            }
                                        }}
                                        disabled={!!quoteSentDate}
                                        className={`flex items-center w-full px-3 py-2 text-sm rounded-lg group ${quoteSentDate
                                            ? 'text-zinc-400 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800/50'
                                            : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                            }`}
                                    >
                                        <Send className={`w-4 h-4 mr-2 ${quoteSentDate ? 'text-zinc-400' : 'text-purple-500 group-hover:text-purple-600'}`} />
                                        <span>{quoteSentDate ? 'Cotización Enviada' : 'Marcar como Enviada'}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status, onClick }: { status: string, onClick?: () => void }) {
    const colors: Record<string, string> = {
        'EN_CURSO': 'bg-blue-100 text-blue-700',
        'BLOQUEADO': 'bg-red-100 text-red-700',
        'CERRADO': 'bg-green-100 text-green-700',
        'EN_ESPERA': 'bg-yellow-100 text-yellow-700',
        'CANCELADO': 'bg-zinc-100 text-zinc-700'
    };

    return (
        <button
            onClick={onClick}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${colors[status] || colors['CANCELADO']}`}
        >
            {status.replace('_', ' ')}
        </button>
    )
}
