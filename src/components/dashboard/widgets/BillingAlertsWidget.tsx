'use client';

import { AlertCircle, CalendarClock, DollarSign } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface AlertItem {
    id: string;
    title: string;
    date: Date | string;
    type: 'INVOICE' | 'DELIVERY' | 'MEETING';
    entityName: string;
    subtext?: string;
    link?: string;
}

export function BillingAlertsWidget({ alerts }: { alerts: AlertItem[] }) {
    const invoices = alerts.filter(a => a.type === 'INVOICE');

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'short'
        });
    };

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm flex flex-col h-full">
            <div className="p-4 border-b border-border flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Próxima Facturación
                </h3>
            </div>
            <div className="flex-1 overflow-auto max-h-[300px]">
                {invoices.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                        No hay facturas por vencer pronto.
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {invoices.map((inv) => (
                            <div key={inv.id} className="p-3 hover:bg-muted/30 transition-colors">
                                <Link href={inv.link || '#'} className="flex items-center justify-between group">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 bg-amber-50 dark:bg-amber-900/20 p-1.5 rounded-full border border-amber-100 dark:border-amber-800">
                                            <CalendarClock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                                {inv.entityName}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Vence: {formatDate(inv.date)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-foreground">{inv.subtext}</p>
                                        <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-normal border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
                                            Pendiente
                                        </Badge>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
