'use client';

import { BarChart3, TrendingUp } from "lucide-react";

interface ClientRankingItem {
    name: string;
    value: number;
}

export function ClientRankingWidget({ clients }: { clients: ClientRankingItem[] }) {
    const maxVal = Math.max(...clients.map(c => c.value)) || 1;

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm flex flex-col h-full">
            <div className="p-4 border-b border-border flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Top Clientes
                </h3>
            </div>
            <div className="flex-1 overflow-auto p-4 max-h-[300px]">
                {clients.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-4">
                        No hay datos suficientes.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {clients.map((client, idx) => (
                            <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium truncate max-w-[150px]">{client.name}</span>
                                    <span className="text-muted-foreground font-mono">
                                        {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(client.value)}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                        style={{ width: `${(client.value / maxVal) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
