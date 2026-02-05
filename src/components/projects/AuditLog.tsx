'use client'

import { Database } from "@/types/supabase";
import { Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type AuditLogEntry = Database['public']['Tables']['AuditLog']['Row'];

interface Props {
    logs: AuditLogEntry[];
}

export function AuditLog({ logs }: Props) {
    if (logs.length === 0) {
        return (
            <div className="text-center p-8 text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay actividad registrada aún.</p>
            </div>
        );
    }

    return (
        <div className="flow-root">
            <ul role="list" className="-mb-8">
                {logs.map((log, logIdx) => (
                    <li key={log.id}>
                        <div className="relative pb-8">
                            {logIdx !== logs.length - 1 ? (
                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
                            ) : null}
                            <div className="relative flex space-x-3">
                                <div>
                                    <span className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center ring-8 ring-white dark:ring-zinc-950">
                                        <User className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                                    </span>
                                </div>
                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                    <div>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            <span className="font-medium text-zinc-900 dark:text-white">{log.userName || 'Usuario'}</span>{' '}
                                            realizó la acción <span className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">{log.action}</span>
                                        </p>
                                        {log.details && (
                                            <p className="text-xs text-zinc-400 mt-0.5">{log.details}</p>
                                        )}
                                    </div>
                                    <div className="whitespace-nowrap text-right text-sm text-zinc-500">
                                        <time dateTime={log.createdAt || undefined}>
                                            {log.createdAt
                                                ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: es })
                                                : '-'}
                                        </time>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
