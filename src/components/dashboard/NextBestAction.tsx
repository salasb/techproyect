"use client";

import { MessageSquare, Phone, Mail, FileText, AlertCircle, Calendar, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

interface Action {
    id: string;
    projectId?: string;
    opportunityId?: string;
    projectName?: string;
    opportunityTitle?: string;
    companyName: string;
    type: string;
    title: string;
    message?: string;
    dueDate?: Date;
    isOverdue?: boolean;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
}

interface NextBestActionProps {
    action: Action | null;
}

const typeConfig: Record<string, { icon: any, color: string, label: string }> = {
    CALL: { icon: Phone, color: "text-blue-600", label: "Llamada" },
    EMAIL: { icon: Mail, color: "text-indigo-600", label: "Correo" },
    TASK: { icon: FileText, color: "text-emerald-600", label: "Tarea" },
    SENTINEL_ALERT: { icon: Zap, color: "text-amber-600", label: "Sentinel" },
    BLOCKER: { icon: AlertCircle, color: "text-red-600", label: "Bloqueador" },
    INVOICE: { icon: FileText, color: "text-purple-600", label: "Factura" },
    MEETING: { icon: Calendar, color: "text-rose-600", label: "Reunión" },
};

export function NextBestAction({ action }: NextBestActionProps) {
    if (!action) {
        return (
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-6 flex flex-col items-center justify-center text-center space-y-3">
                <Zap className="w-8 h-8 text-primary/40" />
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Agenda Despejada</h3>
                    <p className="text-xs text-muted-foreground max-w-[200px]">No hay acciones críticas prioritarias en este momento.</p>
                </div>
            </div>
        );
    }

    const config = typeConfig[action.type] || typeConfig.TASK;
    const Icon = config.icon;

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border-l-4 border-l-primary border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <span className="flex h-2 w-2 rounded-full bg-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Siguiente Mejor Acción</span>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500`}>
                    {action.reason}
                </div>
            </div>

            <div className="flex gap-4">
                <div className={`p-3 rounded-xl bg-primary/5 ${config.color} shrink-0`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold text-foreground truncate">{action.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 mb-3 line-clamp-1">
                        {action.projectId ? `Proyecto: ${action.projectName}` : action.companyName}
                    </p>

                    {action.message && (
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 text-xs text-zinc-600 dark:text-zinc-400 mb-4 border border-zinc-100 dark:border-zinc-800">
                            {action.message}
                        </div>
                    )}

                    <Link
                        href={action.projectId ? `/projects/${action.projectId}` : "/dashboard"}
                        className="inline-flex items-center justify-center w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-sm group-hover:bg-primary/90 transition-colors"
                    >
                        Ejecutar Ahora
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
