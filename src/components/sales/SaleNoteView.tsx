'use client'

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Printer, Download, Mail } from "lucide-react";

interface SaleNoteViewProps {
    note: any;
    project: any;
}

export default function SaleNoteView({ note, project }: SaleNoteViewProps) {
    if (!note) return null;

    const totalNet = project.quoteItems?.reduce((sum: number, item: any) => sum + (item.priceNet * item.quantity), 0) || 0;
    const IVA = totalNet * 0.19;
    const totalGross = totalNet + IVA; // Assuming standard 19% VAT

    return (
        <div className="bg-white text-slate-900 p-0 max-w-4xl mx-auto shadow-2xl border border-slate-200 printable-content rounded-sm overflow-hidden mb-8 print:shadow-none print:border-none print:mb-0">

            {/* BRANDING HEADER STRIP */}
            <div className="bg-slate-900 h-2 w-full print:bg-slate-900"></div>

            <div className="p-8 md:p-12 print:p-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-8 print:mb-6 print:gap-4">
                    <div className="flex-1">
                        <img
                            src="/techwise logo negro.png"
                            alt="TechWise"
                            className="h-12 w-auto object-contain mb-4 print:h-10 print:mb-2"
                        />
                        <div className="text-sm text-slate-500 space-y-0.5 print:text-xs">
                            <p className="font-bold text-slate-900">TechWise SpA</p>
                            <p>RUT: 77.966.773-1</p>
                            <p>Av. Las Condes 10465, Of. 045 A, Edif. Estoril Capital, Las Condes</p>
                            <p>contacto@techwise.cl</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <h1 className="text-3xl font-light text-slate-900 tracking-tight uppercase mb-2 print:text-2xl print:mb-1">Nota de Venta</h1>
                        <p className="text-slate-400 font-mono text-xl print:text-lg">N° {String(note.correlative).padStart(6, '0')}</p>
                        <div className="mt-4 inline-block text-right bg-slate-50 rounded-lg p-3 border border-slate-100 print:mt-2 print:p-2 print:bg-transparent print:border-none">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fecha de Emisión</p>
                            <p className="font-semibold text-slate-900 print:text-sm">
                                {note.generatedAt ? (() => {
                                    try {
                                        return format(new Date(note.generatedAt), "dd 'de' MMMM, yyyy", { locale: es });
                                    } catch { return '-'; }
                                })() : '-'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 border-t border-b border-slate-100 py-8 print:gap-8 print:mb-6 print:py-4">
                    <div>
                        <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 print:mb-2 print:text-[10px]">Cliente</h3>
                        <div className="space-y-1 print:text-sm">
                            <p className="text-lg font-bold text-slate-900 leading-tight print:text-base">{project.company?.name || "Cliente General"}</p>
                            <p className="text-slate-600">{project.company?.address || "Dirección no registrada"}</p>
                            <p className="text-slate-600 font-mono text-sm">RUT: {project.company?.taxId || "S/I"}</p>
                            {project.clientId && <p className="text-slate-500 text-sm mt-2">Atn: {project.client?.name}</p>}
                        </div>
                    </div>
                    <div className="md:text-right">
                        <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 print:mb-2 print:text-[10px]">Referencia</h3>
                        <div className="space-y-1 print:text-sm">
                            <p className="text-lg font-bold text-slate-900 leading-tight print:text-base">{project.name}</p>
                            <p className="text-slate-600">ID Proyecto: {project.id.substring(0, 8).toUpperCase()}</p>
                            <p className="text-slate-600">Vendedor: {project.responsible || "TechWise Team"}</p>
                        </div>
                    </div>
                </div>

                {/* Items Table - Clean & Modern */}
                <div className="mb-2 print:mb-4">
                    <table className="w-full text-sm print:text-xs">
                        <thead>
                            <tr className="border-b-2 border-slate-900">
                                <th className="py-3 pr-4 text-left font-bold text-slate-900 uppercase text-xs tracking-wider print:py-2">Ítem / Servicio</th>
                                <th className="py-3 px-4 text-center font-bold text-slate-900 uppercase text-xs tracking-wider print:py-2">Cant.</th>
                                <th className="py-3 px-4 text-right font-bold text-slate-900 uppercase text-xs tracking-wider print:py-2">Precio Unit.</th>
                                <th className="py-3 pl-4 text-right font-bold text-slate-900 uppercase text-xs tracking-wider print:py-2">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {project.quoteItems?.map((item: any, i: number) => (
                                <tr key={item.id || i} className="group transition-colors hover:bg-slate-50/50 print:break-inside-avoid">
                                    <td className="py-4 pr-4 align-top print:py-2">
                                        <div className="font-semibold text-slate-800">{item.detail}</div>
                                        {item.sku && <div className="text-xs text-slate-400 font-mono mt-0.5">SKU: {item.sku}</div>}
                                    </td>
                                    <td className="py-4 px-4 text-center align-top text-slate-600 print:py-2">{item.quantity}</td>
                                    <td className="py-4 px-4 text-right align-top text-slate-600 font-mono print:py-2">
                                        {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(item.priceNet)}
                                    </td>
                                    <td className="py-4 pl-4 text-right align-top font-bold text-slate-900 font-mono print:py-2">
                                        {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(item.priceNet * item.quantity)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals Section */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-8 pt-8 border-t border-slate-900 print:pt-4 print:gap-4 print:break-inside-avoid">
                    <div className="text-sm text-slate-500 max-w-xs print:text-xs">
                        <p className="font-bold text-slate-900 mb-2 uppercase text-xs">Información de Pago</p>
                        <div className="bg-slate-50 p-3 rounded text-xs space-y-1 border border-slate-100 print:border hover:border-slate-300 print:bg-transparent print:p-0 print:border-none">
                            <p><span className="font-semibold">Banco:</span> Banco de Chile</p>
                            <p><span className="font-semibold">Titular:</span> TechWise SpA</p>
                            <p><span className="font-semibold">Cuenta Corriente:</span> 1596166003</p>
                            <p><span className="font-semibold">Email:</span> contacto@techwise.cl</p>
                        </div>
                        <p className="mt-4 text-xs italic print:mt-2">
                            Esta nota de venta constituye un compromiso formal. Validez de la oferta sujeta a disponibilidad.
                        </p>
                    </div>

                    <div className="w-full md:w-72 space-y-3 print:space-y-1 print:w-64">
                        <div className="flex justify-between text-sm text-slate-600 print:text-xs">
                            <span>Subtotal Neto</span>
                            <span className="font-mono">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totalNet)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600 print:text-xs">
                            <span>IVA (19%)</span>
                            <span className="font-mono">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(IVA)}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-slate-900 pt-3 border-t border-slate-200 print:pt-2 print:text-lg">
                            <span>Total</span>
                            <span className="font-mono text-blue-600">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totalGross)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Actions - Hidden on Print */}
            <div className="bg-slate-50 p-6 flex justify-center gap-4 border-t border-slate-200 no-print">
                <button
                    onClick={() => window.print()}
                    className="flex items-center px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir / Guardar PDF
                </button>
            </div>

            <style jsx global>{`
                @media print {
                    /* Hide everything by default */
                    body * {
                        visibility: hidden;
                    }
                    /* Show only printable content */
                    .printable-content, .printable-content * {
                        visibility: visible;
                    }
                    .printable-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0 !important;
                        padding: 20px !important; /* Reduced padding */
                        box-shadow: none !important;
                        border: none !important;
                    }
                    /* Avoid breaking inside table rows */
                    tr, td, th {
                        page-break-inside: avoid;
                    }
                    /* Avoid breaking inside totals section */
                    .print\\:break-inside-avoid {
                        break-inside: avoid;
                    }
                    /* Hide non-printable elements strictly */
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
