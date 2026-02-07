'use client'

import { getFinancialReport } from "@/actions/exports";
import { downloadCsv, jsonToCsv } from "@/lib/exportUtils";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export function ReportExportButton() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    async function handleExport() {
        setIsLoading(true);
        try {
            const data = await getFinancialReport();
            if (!data || data.length === 0) {
                toast({ type: 'info', message: 'No hay datos para exportar' });
                return;
            }

            const columns = [
                { header: 'ID', accessor: (item: any) => item.ID },
                { header: 'Proyecto', accessor: (item: any) => item.Proyecto },
                { header: 'Cliente', accessor: (item: any) => item.Cliente },
                { header: 'Estado', accessor: (item: any) => item.Estado },
                { header: 'Etapa', accessor: (item: any) => item.Etapa },
                { header: 'Presupuesto Neto', accessor: (item: any) => item.Presupuesto_Neto },
                { header: 'Costos Reales', accessor: (item: any) => item.Costos_Reales },
                { header: 'Margen Neto', accessor: (item: any) => item.Margen_Neto },
                { header: 'Margen %', accessor: (item: any) => item.Margen_Pct },
                { header: 'Facturado', accessor: (item: any) => item.Facturado },
                { header: 'Cobrado', accessor: (item: any) => item.Cobrado },
                { header: 'Por Cobrar (Bruto)', accessor: (item: any) => item.Por_Cobrar }
            ];

            const csv = jsonToCsv(data, columns);
            downloadCsv(csv, `reporte-financiero-${new Date().toISOString().slice(0, 10)}.csv`);
            toast({ type: 'success', message: 'Reporte generado' });

        } catch (error) {
            console.error(error);
            toast({ type: 'error', message: 'Error al generar reporte' });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <button
            onClick={handleExport}
            disabled={isLoading}
            className="bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
        >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-green-600" />}
            Exportar Reporte
        </button>
    );
}
