"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105"
            aria-label="Imprimir Cotización"
        >
            <Printer className="w-6 h-6" />
        </button>
    );
}
