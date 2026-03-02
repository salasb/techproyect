'use client'

import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { downloadCommercialPdf } from "@/lib/commercial-pdf";
import { format } from "date-fns";

interface Props {
    invoice: any;
}

export function InvoicePdfButton({ invoice }: Props) {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        try {
            const pdfData = {
                type: 'INVOICE' as const,
                number: invoice.id.substring(0, 8).toUpperCase(),
                date: new Date(invoice.createdAt || Date.now()),
                dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
                clientName: invoice.project?.client?.name || invoice.project?.company?.name || 'Cliente General',
                clientTaxId: invoice.project?.client?.taxId || invoice.project?.company?.taxId,
                clientAddress: invoice.project?.client?.address || invoice.project?.company?.address,
                projectName: invoice.project?.name || 'Servicios Profesionales',
                items: [
                    {
                        detail: invoice.project?.name || 'Servicios Profesionales',
                        quantity: 1,
                        unit: 'UN',
                        priceNet: invoice.amountInvoicedGross / 1.19, // Reverse calc if gross is stored
                        totalNet: invoice.amountInvoicedGross / 1.19
                    }
                ],
                subtotal: invoice.amountInvoicedGross / 1.19,
                tax: invoice.amountInvoicedGross - (invoice.amountInvoicedGross / 1.19),
                total: invoice.amountInvoicedGross,
                terms: "Favor realizar transferencia a la cuenta corriente indicada en el portal. Esta factura es un documento tributario válido."
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
