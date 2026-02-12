'use client'

import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Database } from "@/types/supabase";

type Project = Database['public']['Tables']['Project']['Row'] & {
    company: Database['public']['Tables']['Company']['Row'] | null;
    quoteItems: Database['public']['Tables']['QuoteItem']['Row'][];
    client?: Database['public']['Tables']['Client']['Row'] | null;
    acceptedAt?: string | null;
}

type Settings = Database['public']['Tables']['Settings']['Row']

interface Props {
    project: Project;
    settings: Settings;
}

export function QuoteDocument({ project, settings }: Props) {
    // 1. Calculate Financials (Simple reducers as per original View logic)
    // NOTE: For consistency, we should ideally use the centralized calculator, but strictly for UI rendering
    // we can use the passed values if they are accurate.
    // However, the View logic uses `calculateProjectFinancials`.
    // Let's rely on basic math here or assume `project` data is passed correctly.

    // Calculate Totals on the fly to ensure display responsiveness
    const totalNet = project.quoteItems?.reduce((acc, item) => acc + (item.priceNet * item.quantity), 0) || 0;
    const vatRate = settings?.vatRate || 0.19;
    const vatAmount = totalNet * vatRate;
    const totalGross = totalNet + vatAmount;

    // Currency Formatter
    const currency = (project.currency || 'CLP').toUpperCase();
    const fmt = (n: number) => {
        if (currency === 'USD') {
            return 'USD ' + n.toLocaleString('en-US', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 });
        }
        if (currency === 'UF') {
            return 'UF ' + n.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return '$' + n.toLocaleString('es-CL', { maximumFractionDigits: 0 });
    }

    // Sort Items by SKU? User requested better distribution.
    // Sort Items by SKU? User requested better distribution.
    // Let's assume passed items are ordered.

    // Visibility Logic
    const showSku = project.quoteItems?.some(item => item.sku && item.sku.trim().length > 0 && item.sku !== '-');

    return (
        <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white text-slate-800 shadow-2xl print:shadow-none p-[12mm] relative flex flex-col font-sans text-sm print:text-xs">

            {/* --- COMPACT HEADER LAYOUT --- */}
            <div className="flex justify-between items-start mb-4 border-b-2 border-slate-900 pb-4">
                {/* 1. Logo & Provider Info */}
                <div className="w-1/3 pr-4">
                    <img src="/techwise logo negro.png" alt="TECHWISE" className="h-10 w-auto object-contain mb-3" />
                    <div className="text-[10px] text-slate-500 leading-tight">
                        <p className="font-bold text-slate-900">TechWise SpA</p>
                        <p>77.966.773-1</p>
                        <p>Av. Las Condes 10465, Of. 045 A</p>
                        <p>contacto@techwise.cl</p>
                    </div>
                </div>

                {/* 2. Client Info (Center-Right) */}
                <div className="w-1/3 px-4 border-l border-r border-slate-100">
                    <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1">Cliente</p>
                    <h2 className="font-bold text-slate-900 text-sm mb-1 uppercase leading-tight">
                        {project.client?.name || project.company?.name || 'CLIENTE POR DEFINIR'}
                    </h2>
                    <div className="text-[10px] text-slate-600 space-y-0.5">
                        <p><span className="font-medium">RUT:</span> {project.client?.taxId || project.company?.taxId || '-'}</p>
                        <p><span className="font-medium">Att:</span> {project.client?.contactName || project.company?.contactName || '-'}</p>
                        <p>{project.client?.email || project.company?.email || '-'}</p>
                    </div>
                </div>

                {/* 3. Quote Meta (Right) */}
                <div className="w-1/3 pl-4 text-right">
                    <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Cotización</h1>
                    <p className="text-sm font-medium text-slate-500 mb-2">#{project.id.slice(0, 6).toUpperCase()}</p>

                    <div className="text-[10px] space-y-1">
                        <div className="flex justify-end gap-2">
                            <span className="text-slate-400 font-medium uppercase">Fecha:</span>
                            <span className="font-bold text-slate-900">{format(new Date(), 'dd-MM-yyyy')}</span>
                        </div>
                        <div className="flex justify-end gap-2">
                            <span className="text-slate-400 font-medium uppercase">Validez:</span>
                            <span className="font-bold text-slate-900">15 Días</span>
                        </div>
                        <div className="flex justify-end gap-2">
                            <span className="text-slate-400 font-medium uppercase">Moneda:</span>
                            <span className="font-bold text-slate-900">{currency}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- PROJECT SCOPE / TITLE --- */}
            <div className="mb-4">
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1">Proyecto</p>
                <div className="font-bold text-base text-slate-900 uppercase">
                    {project.name}
                </div>
                {/* Always show description if available, or scopeDetails fallback */}
                {/* Use scopeDetails as description */}
                {project.scopeDetails && (
                    <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed whitespace-pre-line">
                        {project.scopeDetails}
                    </p>
                )}
            </div>

            {/* --- ITEMS TABLE --- */}
            <div className="mb-6 flex-grow">
                <table className="w-full text-xs border-collapse table-auto">
                    <thead>
                        <tr className="border-b-2 border-slate-900">
                            {/* Replaced # with SKU for better tracking */}
                            {showSku && <th className="text-left py-2 font-bold text-slate-900 w-16">SKU</th>}
                            <th className="text-left py-2 font-bold text-slate-900 pl-4">DESCRIPCIÓN</th>
                            <th className="text-center py-2 font-bold text-slate-900 w-12">CANT.</th>
                            <th className="text-right py-2 font-bold text-slate-900 w-24">UNITARIO</th>
                            <th className="text-right py-2 font-bold text-slate-900 w-24">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {project.quoteItems && project.quoteItems.length > 0 ? (
                            project.quoteItems.map((item, index) => (
                                <tr key={item.id} className="break-inside-avoid">
                                    {showSku && (
                                        <td className="py-2 text-slate-400 align-top font-mono text-[10px] leading-relaxed pt-3">
                                            {item.sku || '-'}
                                        </td>
                                    )}
                                    <td className="py-2 pl-4 align-top pt-3">
                                        <div className="font-medium text-slate-900 uppercase mb-1 leading-snug">
                                            <span className="whitespace-pre-line">{item.detail}</span>
                                        </div>
                                    </td>
                                    <td className="py-2 text-center text-slate-600 align-top pt-3">
                                        <span className="font-bold">{item.quantity}</span>
                                        <span className="block text-[8px] uppercase text-slate-400">{item.unit}</span>
                                    </td>
                                    <td className="py-2 text-right text-slate-600 align-top font-mono pt-3">
                                        {fmt(item.priceNet)}
                                    </td>
                                    <td className="py-2 text-right font-bold text-slate-900 align-top font-mono pt-3">
                                        {fmt(item.priceNet * item.quantity)}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={showSku ? 5 : 4} className="py-12 px-4 text-center text-zinc-400">
                                    <p>No se han agregado ítems a esta cotización.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- FOOTER & TOTALS --- */}
            <div className="flex flex-col md:flex-row gap-8 mb-8 break-inside-avoid">
                {/* Terms / Disclaimer */}
                <div className="flex-1 text-[10px] text-slate-500 text-justify leading-relaxed pr-8">
                    <p className="mb-2"><strong>Condiciones Comerciales:</strong></p>
                    <ul className="list-disc list-inside space-y-0.5 pl-1 mb-2">
                        <li>Forma de pago: {
                            (project as any).paymentMethod === 'CASH' ? 'Contado contra entrega.' :
                                (project as any).paymentMethod === '30_DAYS' ? 'Crédito 30 días contra factura.' :
                                    '50% anticipo, 50% contra entrega conforme (o según acuerdo).'
                        }</li>
                        <li>Entrega: A coordinar según stock.</li>
                        <li>Validez de la oferta: 15 días.</li>
                    </ul>
                    <p className="italic opacity-80">
                        TechWise SpA se reserva el derecho de modificar precios ante variaciones significativas del tipo de cambio.
                    </p>
                </div>

                {/* Totals Box */}
                <div className="w-full md:w-64">
                    <div className="flex justify-between items-center py-1 border-b border-slate-200 text-xs">
                        <span className="font-medium text-slate-600">Neto:</span>
                        <span className="font-mono font-medium">{fmt(totalNet)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-200 text-xs">
                        <span className="font-medium text-slate-600">IVA ({(vatRate * 100).toFixed(0)}%):</span>
                        <span className="font-mono font-medium">{fmt(vatAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 mt-1 bg-slate-100 rounded px-2">
                        <span className="font-bold text-slate-900 uppercase text-xs">Total:</span>
                        <span className="font-mono font-bold text-sm">{fmt(totalGross)}</span>
                    </div>
                </div>
            </div>

            {/* --- SIGNATURES --- */}
            <div className="mt-auto pt-8 pb-4 break-inside-avoid">
                <div className="grid grid-cols-2 gap-16">
                    <div className="text-center">
                        <div className="border-t border-slate-300 w-3/4 mx-auto mb-2"></div>
                        <p className="font-bold text-slate-900 text-xs uppercase">Christian Salas / Techwise SpA</p>
                        <p className="text-[10px] text-slate-500 uppercase">Proveedor</p>
                    </div>
                    <div className="text-center relative">
                        {project.acceptedAt ? (
                            <div className="absolute inset-0 flex items-center justify-center -top-8">
                                <div className="border-4 border-emerald-600 text-emerald-600 rounded-lg px-4 py-2 font-black uppercase text-lg transform -rotate-12 opacity-80 select-none pointer-events-none">
                                    ACEPTADO DIGITALMENTE
                                    <div className="text-[8px] font-mono font-normal text-center mt-1 text-emerald-600">
                                        {format(new Date(project.acceptedAt), 'dd/MM/yyyy HH:mm')}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="border-t border-slate-300 w-3/4 mx-auto mb-2"></div>
                        )}
                        <p className="font-bold text-slate-900 text-xs uppercase z-10 relative">Aceptación Cliente</p>
                        <p className="text-[10px] text-slate-500 uppercase z-10 relative">Firma y Timbre</p>
                    </div>
                </div>
            </div>

            {/* --- BANK INFO --- */}
            <div className="mt-8 pt-4 border-t border-slate-100 text-[9px] text-slate-400 text-center uppercase tracking-wider">
                TechWise SpA | 77.966.773-1 | Banco de Chile | Cuenta Corriente N° 1596166003 | contacto@techwise.cl
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                    }
                    tr, td, th {
                        page-break-inside: avoid !important;
                    }
                    .break-inside-avoid {
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>
        </div>
    );
}
