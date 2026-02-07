'use client'

import { getQuotesForExport } from "@/actions/exports";
import { downloadCsv, jsonToCsv } from "@/lib/exportUtils";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export function QuoteExportButton({ query }: { query: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    async function handleExport() {
        setIsLoading(true);
        try {
            const data = await getQuotesForExport(query);
            if (!data || data.length === 0) {
                toast({ type: 'info', message: 'No hay datos para exportar' });
                return;
            }

            const columns = [
                { header: 'ID Proyecto', accessor: (item: any) => item.ID },
                { header: 'Proyecto', accessor: (item: any) => item.Proyecto },
                { header: 'Cliente', accessor: (item: any) => item.Cliente },
                { header: 'Fecha', accessor: (item: any) => item.Fecha },
                { header: 'Estado', accessor: (item: any) => item.Estado },
                { header: 'Moneda', accessor: (item: any) => item.Moneda },
                { header: 'Valor Total', accessor: (item: any) => item.Valor_Total }
            ];

            const csv = jsonToCsv(data, columns);
            downloadCsv(csv, `cotizaciones-${new Date().toISOString().slice(0, 10)}.csv`);
            toast({ type: 'success', message: 'Exportación completada' });

        } catch (error) {
            console.error(error);
            toast({ type: 'error', message: 'Error al exportar' });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <button
            onClick={handleExport}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar CSV
        </button>
    );
}
