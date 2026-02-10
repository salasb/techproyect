'use client'

import { useState } from "react";
import { History } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { GlobalAuditLog } from "./GlobalAuditLog";
import { Database } from "@/types/supabase";

type AuditLogEntry = Database['public']['Tables']['AuditLog']['Row'];

interface Props {
    logs: AuditLogEntry[];
}

export function GlobalAuditModal({ logs }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="group w-full bg-white dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all shadow-sm hover:shadow-md flex items-center justify-between"
            >
                <div className="flex items-center space-x-5">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                        <History className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Logs de Cambio</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Ver el historial completo de acciones del sistema</p>
                    </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 px-4 py-1.5 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-100 dark:group-hover:border-blue-800 transition-all">
                    Abrir Auditoría
                </div>
            </button>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Historial de Cambios del Sistema"
                description="Registro detallado de acciones, modificaciones y eliminaciones."
                maxWidth="2xl"
            >
                <div className="pb-4">
                    <GlobalAuditLog logs={logs} />
                </div>
            </Modal>
        </>
    );
}
