'use client'

import { getQuotesForExport } from "@/actions/exports";
import { downloadCsv, jsonToCsv, downloadPdf, downloadXlsx } from "@/lib/exportUtils";
import { Download, Loader2, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

export function QuoteExportButton({ query }: { query: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function handleExport(format: 'csv' | 'xlsx' | 'pdf') {
        setIsLoading(true);
        setIsOpen(false);
        try {
            const data = await getQuotesForExport(query);
            if (!data || data.length === 0) {
                toast({ type: 'info', message: 'No hay datos para exportar' });
                return;
            }

            const columns = [
                { header: 'ID', accessor: (item: any) => item.ID },
                { header: 'Proyecto', accessor: (item: any) => item.Proyecto },
                { header: 'Cliente', accessor: (item: any) => item.Cliente },
                { header: 'Fecha Creación', accessor: (item: any) => item.Fecha_Creacion },
                { header: 'Fecha Envío', accessor: (item: any) => item.Fecha_Envio },
                { header: 'Estado', accessor: (item: any) => item.Estado },
                { header: 'Moneda', accessor: (item: any) => item.Moneda },
                { header: 'Valor Total', accessor: (item: any) => item.Valor_Total }
            ];

            const filename = `cotizaciones-${new Date().toISOString().slice(0, 10)}`;

            if (format === 'csv') {
                const csv = jsonToCsv(data, columns);
                downloadCsv(csv, `${filename}.csv`);
                toast({ type: 'success', message: 'Reporte CSV generado' });
            } else if (format === 'xlsx') {
                downloadXlsx(data, `${filename}.xlsx`);
                toast({ type: 'success', message: 'Reporte Excel generado' });
            } else if (format === 'pdf') {
                downloadPdf(data, columns, `${filename}.pdf`, 'Reporte de Cotizaciones');
                toast({ type: 'success', message: 'Reporte PDF generado' });
            }

        } catch (error) {
            console.error(error);
            toast({ type: 'error', message: 'Error al exportar' });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                className="bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Exportar Cotizaciones
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 z-50 animate-in fade-in zoom-in-95">
                    <button
                        onClick={() => handleExport('xlsx')}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                        Excel (.xlsx)
                    </button>
                    <button
                        onClick={() => handleExport('pdf')}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4 text-red-600" />
                        PDF (.pdf)
                    </button>
                    <div className="border-t border-zinc-100 dark:border-zinc-800 my-1"></div>
                    <button
                        onClick={() => handleExport('csv')}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                    >
                        <span className="w-4 h-4 flex items-center justify-center font-mono text-[10px] border rounded border-zinc-400 text-zinc-500">,</span>
                        CSV (.csv)
                    </button>
                </div>
            )}
        </div>
    );
}
