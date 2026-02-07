'use client'

import { AlertTriangle, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Alert {
    type: 'danger' | 'warning';
    message: string;
    link?: string;
}

export function AlertsWidget({ alerts }: { alerts: Alert[] }) {
    if (!alerts || alerts.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm p-6 min-h-[200px]">
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-full mb-3">
                    <AlertCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <p>Todo en orden.</p>
                <p className="text-xs mt-1">No hay alertas críticas.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3 p-4">
            {alerts.map((alert, idx) => (
                <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${alert.type === 'danger'
                            ? 'bg-red-50 border-red-100 text-red-900 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-200'
                            : 'bg-amber-50 border-amber-100 text-amber-900 dark:bg-amber-900/20 dark:border-amber-900/50 dark:text-amber-200'
                        }`}
                >
                    {alert.type === 'danger' ? (
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                    ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    )}

                    <div className="flex-1">
                        <p className="font-medium">{alert.message}</p>
                        {alert.link && (
                            <Link href={alert.link} className="flex items-center text-xs mt-1.5 opacity-80 hover:opacity-100 underline hover:no-underline font-semibold">
                                Ver Detalle <ArrowRight className="w-3 h-3 ml-1" />
                            </Link>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
