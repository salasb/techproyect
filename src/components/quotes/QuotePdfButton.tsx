'use client'

import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { downloadCommercialPdf } from "@/lib/commercial-pdf";

interface Props {
    quote: unknown;
}

interface QuoteItem {
    detail: string;
    quantity: number;
    unit?: string;
    priceNet: number;
}

export function QuotePdfButton({ quote }: Props) {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        try {
            const q = quote as {
                id: string;
                version: number;
                createdAt: string | Date;
                totalNet: number;
                quoteItems?: QuoteItem[];
                project?: {
                    name: string;
                    client?: { name: string; taxId?: string; address?: string } | null;
                    company?: { name: string; taxId?: string; address?: string } | null;
                }
            };

            const items = q.quoteItems || [];
            const subtotal = q.totalNet || 0;
            const tax = subtotal * 0.19;
            const total = subtotal + tax;

            const pdfData = {
                type: 'QUOTE' as const,
                number: q.id.substring(0, 8).toUpperCase(),
                version: q.version,
                date: new Date(q.createdAt || Date.now()),
                clientName: q.project?.client?.name || q.project?.company?.name || 'Cliente General',
                clientTaxId: q.project?.client?.taxId || q.project?.company?.taxId,
                clientAddress: q.project?.client?.address || q.project?.company?.address,
                projectName: q.project?.name || 'Propuesta Comercial',
                items: items.map((i) => ({
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
