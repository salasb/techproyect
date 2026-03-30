'use client';

import { Download, Loader2, FileSpreadsheet, FileText, ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { downloadCsv, downloadXlsx } from "@/lib/exportUtils";

interface ProjectExportButtonProps {
    orgId: string;
    tab: string;
}

export function ProjectExportButton({ orgId, tab }: ProjectExportButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Handle clicking outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleExport = async (format: 'csv' | 'xlsx') => {
        setIsLoading(true);
        setIsOpen(false);
        try {
            // Trigger the API endpoint to generate the export data
            const res = await fetch(`/api/projects/export?format=${format}&tab=${tab}`);
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Error exportando proyectos");
            }

            const data = await res.json();

            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `proyectos-techproyect-${dateStr}`;

            if (format === 'csv') {
                downloadCsv(data.csv, `${filename}.csv`);
            } else {
                downloadXlsx(data.json, `${filename}.xlsx`);
            }

            toast({ type: 'success', message: `Proyectos exportados a ${format.toUpperCase()} con éxito` });
        } catch (error) {
            toast({ type: 'error', message: "No se pudo exportar los proyectos. Intente nuevamente." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700 text-zinc-700 dark:text-zinc-200 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Download className="w-4 h-4 text-blue-600" />}
                Exportar
                <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 space-y-1">
                        <button
                            onClick={() => handleExport('xlsx')}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700/50 rounded-lg transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                <span className="font-medium">Excel (.xlsx)</span>
                            </div>
                        </button>
                        <button
                            onClick={() => handleExport('csv')}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700/50 rounded-lg transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-zinc-500" />
                                <span className="font-medium">CSV</span>
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}