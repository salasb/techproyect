'use client'

import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { downloadCommercialPdf } from "@/lib/commercial-pdf";
import { format } from "date-fns";

interface Props {
    quote: any;
}

export function QuotePdfButton({ quote }: Props) {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        try {
            const items = quote.quoteItems || [];
            const subtotal = quote.totalNet || 0;
            const tax = subtotal * 0.19;
            const total = subtotal + tax;

            const pdfData = {
                type: 'QUOTE' as const,
                number: quote.id.substring(0, 8).toUpperCase(),
                version: quote.version,
                date: new Date(quote.createdAt || Date.now()),
                clientName: quote.project?.client?.name || quote.project?.company?.name || 'Cliente General',
                clientTaxId: quote.project?.client?.taxId || quote.project?.company?.taxId,
                clientAddress: quote.project?.client?.address || quote.project?.company?.address,
                projectName: quote.project?.name || 'Propuesta Comercial',
                items: items.map((i: any) => ({
                    detail: i.detail,
                    quantity: i.quantity,
                    unit: i.unit || 'UN',
                    priceNet: i.priceNet,
                    totalNet: i.priceNet * i.quantity
                })),
                subtotal,
                tax,
                total,
                terms: "Propuesta sujeta a disponibilidad técnica. Validez: 15 días. Forma de pago: 50% anticipo, 50% contra entrega."
            };

            downloadCommercialPdf(pdfData);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={loading}
            className="flex items-center gap-2 hover:text-blue-600 transition-colors"
            title="Descargar PDF"
        >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
            <span className="text-[10px] font-bold uppercase tracking-tighter">PDF</span>
        </button>
    );
}
