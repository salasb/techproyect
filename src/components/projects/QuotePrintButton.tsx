"use client";

import { Printer } from "lucide-react";

export function QuotePrintButton({ variant = "floating" }: { variant?: "floating" | "solid" }) {
    if (variant === "solid") {
        return (
            <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
            >
                <Printer className="w-4 h-4" />
                Imprimir / Guardar como PDF
            </button>
        )
    }

    return (
        <button
            onClick={() => window.print()}
            className="fixed bottom-8 right-8 print:hidden bg-zinc-900 hover:bg-zinc-800 text-white rounded-full p-4 shadow-xl transition-all hover:scale-105 flex items-center gap-3 z-50"
        >
            <Printer className="w-6 h-6" />
            <span className="font-medium pr-2">Imprimir Cotización</span>
        </button>
    )
}
