'use client'

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Printer } from "lucide-react";

interface SaleNoteViewProps {
    note: any; // Type strictly later
    project: any;
}

export default function SaleNoteView({ note, project }: SaleNoteViewProps) {
    if (!note) return null;

    const totalNet = project.quoteItems?.reduce((sum: number, item: any) => sum + (item.priceNet * item.quantity), 0) || 0;
    const IVA = totalNet * 0.19;
    const totalGross = totalNet + IVA;

    return (
        <div className="bg-white text-black p-8 max-w-4xl mx-auto shadow-lg border border-gray-200 printable-content">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">NOTA DE VENTA</h1>
                    <p className="text-gray-500">N° {String(note.correlative).padStart(6, '0')}</p>
                </div>
                <div className="text-right">
                    <p className="font-semibold text-lg">TechProyect SpA</p>
                    <p className="text-sm text-gray-600">RUT: 76.123.456-7</p>
                    <p className="text-sm text-gray-600">Av. Providencia 1234, Of 501</p>
                </div>
            </div>

            {/* Client Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-1">Cliente</h3>
                    <p className="font-semibold">{project.company?.name || "Cliente General"}</p>
                    <p className="text-sm text-gray-600">{project.company?.address || "Dirección no registrada"}</p>
                    <p className="text-sm text-gray-600">RUT: {project.company?.taxId || "S/I"}</p>
                </div>
                <div className="text-right">
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-1">Detalles</h3>
                    <p className="text-sm">
                        <span className="font-medium">Fecha:</span>{' '}
                        {note.generatedAt ? (
                            (() => {
                                try {
                                    return format(new Date(note.generatedAt), "dd 'de' MMMM, yyyy", { locale: es });
                                } catch (e) {
                                    return 'Fecha inválida';
                                }
                            })()
                        ) : 'Sin fecha'}
                    </p>
                    <p className="text-sm"><span className="font-medium">Vendedor:</span> {project.responsible}</p>
                    <p className="text-sm"><span className="font-medium">Ref Proyecto:</span> {project.name}</p>
                </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-y border-gray-200">
                        <tr>
                            <th className="py-2 px-4 text-left font-semibold text-gray-600">Ítem</th>
                            <th className="py-2 px-4 text-center font-semibold text-gray-600">Cant.</th>
                            <th className="py-2 px-4 text-center font-semibold text-gray-600">Unidad</th>
                            <th className="py-2 px-4 text-right font-semibold text-gray-600">P. Unit</th>
                            <th className="py-2 px-4 text-right font-semibold text-gray-600">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {project.quoteItems?.map((item: any, i: number) => (
                            <tr key={item.id || i}>
                                <td className="py-3 px-4">{item.detail}</td>
                                <td className="py-3 px-4 text-center">{item.quantity}</td>
                                <td className="py-3 px-4 text-center text-gray-500">{item.unit}</td>
                                <td className="py-3 px-4 text-right">
                                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(item.priceNet)}
                                </td>
                                <td className="py-3 px-4 text-right font-medium">
                                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(item.priceNet * item.quantity)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-12">
                <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Neto:</span>
                        <span className="font-medium">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totalNet)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">IVA (19%):</span>
                        <span className="font-medium">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(IVA)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
                        <span>Total:</span>
                        <span>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totalGross)}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 mt-12 pt-8 border-t border-gray-100">
                <p>Generado automáticamente por TechWise System</p>
                <div className="mt-4 no-print">
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded hover:bg-black transition-colors"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir / Guardar PDF
                    </button>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print, header, nav, aside { display: none !important; }
                    .printable-content { border: none !important; shadow: none !important; padding: 0 !important; }
                    body { background: white; }
                }
            `}</style>
        </div>
    );
}
