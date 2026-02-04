'use client'

import { useState } from "react";
import { Database } from "@/types/supabase";
import { updateProjectSettings } from "@/app/actions/project-settings";
import { AlertCircle, Lock, Unlock, Clock, FileText, ChevronDown, Eye, Download } from "lucide-react";
import { differenceInCalendarDays, isBefore, startOfDay } from "date-fns";
import Link from "next/link";

type Project = Database['public']['Tables']['Project']['Row'];
type Company = Database['public']['Tables']['Company']['Row'];

interface Props {
    project: Project & { company: Company };
}

export function ProjectHeader({ project }: Props) {
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [isQuoteMenuOpen, setIsQuoteMenuOpen] = useState(false);

    // Alert Logic
    const today = new Date();
    const nextActionDate = project.nextActionDate ? new Date(project.nextActionDate) : null;
    const isOverdue = nextActionDate && isBefore(startOfDay(nextActionDate), startOfDay(today));
    const isDueToday = nextActionDate && differenceInCalendarDays(nextActionDate, today) === 0;

    async function handleStatusChange(newStatus: string) {
        let blockingReason = project.blockingReason;

        if (newStatus === 'BLOQUEADO') {
            const reason = prompt("Por favor, ingresa el motivo del bloqueo:", blockingReason || "");
            if (reason === null) return; // Cancelled
            blockingReason = reason;
        }

        await updateProjectSettings(project.id, {
            status: newStatus as any, // Cast to literal type if needed, or string matches
            blockingReason: newStatus === 'BLOQUEADO' ? blockingReason : null
        });

        setIsEditingStatus(false);
    }

    return (
        <div className="space-y-4">
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
                        <span>{project.company.name}</span>
                        <span>/</span>
                        <span>{project.id}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
                    <div className="flex items-center space-x-2 mt-2">
                        <StatusBadge status={project.status} onClick={() => setIsEditingStatus(!isEditingStatus)} />
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            {project.stage}
                        </span>
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
                                        href={`/quotes/${project.id}`}
                                        target="_blank"
                                        className="flex items-center w-full px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg group"
                                        onClick={() => setIsQuoteMenuOpen(false)}
                                    >
                                        <Eye className="w-4 h-4 mr-2 text-blue-500 group-hover:text-blue-600" />
                                        <span>Visualizar</span>
                                    </Link>
                                    <Link
                                        href={`/quotes/${project.id}?print=true`}
                                        target="_blank"
                                        className="flex items-center w-full px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg group"
                                        onClick={() => setIsQuoteMenuOpen(false)}
                                    >
                                        <Download className="w-4 h-4 mr-2 text-green-500 group-hover:text-green-600" />
                                        <span>Descargar (PDF)</span>
                                    </Link>
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
