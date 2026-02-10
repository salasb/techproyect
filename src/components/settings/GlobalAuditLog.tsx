'use client'

import { useState } from "react";
import { Database } from "@/types/supabase";
import { History, User, ExternalLink, Trash2, PlusCircle, Edit3, CheckCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

type AuditLogEntry = Database['public']['Tables']['AuditLog']['Row'];

interface Props {
    logs: AuditLogEntry[];
}

const ACTION_ICONS: Record<string, any> = {
    'PROJECT_CREATE': PlusCircle,
    'PROJECT_DELETE': Trash2,
    'COST_ADD': PlusCircle,
    'COST_UPDATE': Edit3,
    'COST_DELETE': Trash2,
    'QUOTE_ACCEPTANCE_TOGGLE': CheckCircle,
    'UPDATE_SETTINGS': Edit3,
    'DEFAULT': History
};

const ACTION_COLORS: Record<string, string> = {
    'PROJECT_CREATE': 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    'PROJECT_DELETE': 'text-red-500 bg-red-50 dark:bg-red-900/20',
    'COST_DELETE': 'text-red-500 bg-red-50 dark:bg-red-900/20',
    'DEFAULT': 'text-zinc-500 bg-zinc-50 dark:bg-zinc-900/20'
};

export function GlobalAuditLog({ logs }: Props) {
    const [isExpanded, setIsExpanded] = useState(false);
    const MAX_ITEMS = 15;

    if (logs.length === 0) {
        return (
            <div className="text-center p-12 text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No hay registros de cambios disponibles.</p>
            </div>
        );
    }

    const visibleLogs = isExpanded ? logs : logs.slice(0, MAX_ITEMS);

    return (
        <div className="space-y-4">
            <div className="flow-root">
                <ul role="list" className="-mb-8">
                    {visibleLogs.map((log, logIdx) => {
                        const Icon = ACTION_ICONS[log.action] || ACTION_ICONS.DEFAULT;
                        const colorClass = ACTION_COLORS[log.action] || ACTION_COLORS.DEFAULT;

                        return (
                            <li key={log.id}>
                                <div className="relative pb-8">
                                    {logIdx !== visibleLogs.length - 1 ? (
                                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-zinc-100 dark:bg-zinc-800" aria-hidden="true" />
                                    ) : null}
                                    <div className="relative flex items-start space-x-3">
                                        <div className="relative">
                                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-white dark:ring-zinc-900 ${colorClass}`}>
                                                <Icon className="h-4 w-4 shadow-sm" aria-hidden="true" />
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1 py-1 px-3 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-xl border border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <div className="text-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-zinc-900 dark:text-white">
                                                        {log.userName || 'Sistema'}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400 font-medium">
                                                        {log.createdAt
                                                            ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: es })
                                                            : '-'}
                                                    </span>
                                                </div>
                                                <p className="text-zinc-600 dark:text-zinc-400 mt-0.5 text-xs">
                                                    realizó: <span className="font-semibold text-blue-600 dark:text-blue-400">{log.action.replace(/_/g, ' ')}</span>
                                                </p>
                                                {log.details && (
                                                    <div className="mt-2 p-2.5 bg-white dark:bg-zinc-900 rounded-lg text-[11px] font-mono text-zinc-600 dark:text-zinc-400 break-words border border-zinc-200 dark:border-zinc-800 shadow-sm leading-relaxed">
                                                        {log.details}
                                                    </div>
                                                )}
                                                {log.projectId && log.action !== 'PROJECT_DELETE' && (
                                                    <div className="mt-2 text-right">
                                                        <Link
                                                            href={`/projects/${log.projectId}`}
                                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest"
                                                        >
                                                            Ver Proyecto <ExternalLink className="w-2.5 h-2.5" />
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {logs.length > MAX_ITEMS && (
                <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-center pb-4">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors px-6 py-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm uppercase tracking-wider"
                    >
                        {isExpanded ? 'Ver menos' : `Cargar historial completo (${logs.length - MAX_ITEMS} más)`}
                    </button>
                </div>
            )}
        </div>
    );
}
