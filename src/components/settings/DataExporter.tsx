"use client";

import React, { useState } from "react";
import { exportDataAction, ExportType, ExportFormat } from "@/actions/exports";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, FileJson, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export function DataExporter() {
    const [loading, setLoading] = useState<string | null>(null);

    const handleExport = async (type: ExportType, format: ExportFormat) => {
        setLoading(`${type}-${format}`);
        try {
            const result = await exportDataAction(type, format);
            if (result.success && result.content) {
                const blob = new Blob([result.content], { type: result.contentType });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = result.filename || `${type}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success(`Exportación de ${type} lista.`);
            }
        } catch (error: any) {
            toast.error(error.message || "Error en la exportación");
        } finally {
            setLoading(null);
        }
    };

    const resources: { id: ExportType, label: string }[] = [
        { id: 'quotes', label: 'Cotizaciones' },
        { id: 'invoices', label: 'Facturas' },
        { id: 'payments', label: 'Pagos' },
        { id: 'tickets', label: 'Tickets Soporte' }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resources.map((res) => (
                <div key={res.id} className="p-6 border border-border/50 rounded-2xl bg-muted/5 flex items-center justify-between group hover:border-emerald-500/20 transition-all">
                    <div className="space-y-1">
                        <h4 className="font-bold text-sm uppercase tracking-tight">{res.label}</h4>
                        <p className="text-[10px] text-muted-foreground font-medium italic">Histórico completo de la organización.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl h-9 text-[10px] font-bold uppercase tracking-widest border-border/50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all"
                            disabled={!!loading}
                            onClick={() => handleExport(res.id, 'csv')}
                        >
                            {loading === `${res.id}-csv` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 mr-2" />}
                            CSV
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl h-9 text-[10px] font-bold uppercase tracking-widest border-border/50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all"
                            disabled={!!loading}
                            onClick={() => handleExport(res.id, 'json')}
                        >
                            {loading === `${res.id}-json` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileJson className="w-3.5 h-3.5 mr-2" />}
                            JSON
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
