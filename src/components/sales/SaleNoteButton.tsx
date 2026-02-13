'use client'

import { useState } from "react";
import { FileText, Loader2, Check } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface SaleNoteButtonProps {
    projectId: string;
    onNoteGenerated?: (note: any) => void;
}

export default function SaleNoteButton({ projectId, onNoteGenerated }: SaleNoteButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    async function handleGenerateNote() {
        setIsLoading(true);
        try {
            const res = await fetch('/api/sales/generate-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId })
            });

            if (!res.ok) throw new Error("Error generating note");

            const note = await res.json();
            toast({ type: 'success', message: "Nota de Venta generada exitosamente" });

            if (onNoteGenerated) onNoteGenerated(note);

        } catch (error) {
            console.error(error);
            toast({ type: 'error', message: "No se pudo generar la Nota de Venta" });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <button
            onClick={handleGenerateNote}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Generar Nota de Venta
        </button>
    );
}
