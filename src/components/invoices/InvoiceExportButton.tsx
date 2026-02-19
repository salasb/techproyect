'use client'

import { Download } from "lucide-react"

interface Props {
    invoices: any[]
}

export function InvoiceExportButton({ invoices }: Props) {
    const handleExport = () => {
        const headers = ['ID', 'Proyecto', 'Cliente', 'Monto Bruto', 'Pagado', 'Estado', 'Fecha Emisión', 'Vencimiento']
        const rows = invoices.map(inv => {
            const isPaid = inv.amountPaidGross >= inv.amountInvoicedGross
            const status = isPaid ? 'PAGADA' : inv.sent ? 'ENVIADA' : 'BORRADOR'

            return [
                inv.id,
                `"${inv.project?.name || ''}"`,
                `"${inv.project?.client?.name || inv.project?.company?.name || ''}"`,
                inv.amountInvoicedGross,
                inv.amountPaidGross,
                status,
                inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '',
                inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : ''
            ].join(',')
        })

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(',') + "\n"
            + rows.join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `facturas_export_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
            <Download className="w-4 h-4" />
            Exportar CSV
        </button>
    )
}
