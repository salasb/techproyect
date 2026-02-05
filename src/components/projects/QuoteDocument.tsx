import { format } from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";
import { Database } from "@/types/supabase";

type Project = Database['public']['Tables']['Project']['Row'] & {
    company: Database['public']['Tables']['Company']['Row'] | null;
    quoteItems: Database['public']['Tables']['QuoteItem']['Row'][];
}

type Settings = Database['public']['Tables']['Settings']['Row']

interface Props {
    project: Project;
    settings: Settings;
}

export function QuoteDocument({ project, settings }: Props) {
    const totalNet = project.quoteItems?.reduce((acc, item) => acc + (item.priceNet * item.quantity), 0) || 0;
    const vatRate = settings?.vatRate || 0.19;
    const vatAmount = totalNet * vatRate;
    const totalGross = totalNet + vatAmount;

    return (
        <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white text-zinc-900 shadow-2xl print:shadow-none p-[20mm] relative">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-8 mb-8">
                <div>
                    <div className="relative w-48 h-16 mb-2">
                        <Image
                            src="/logo.png"
                            alt="TechWise Logo"
                            fill
                            className="object-contain object-left"
                            priority
                        />
                    </div>
                    <p className="text-sm text-zinc-500">Soluciones Tecnológicas</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-semibold mb-2">COTIZACIÓN</h2>
                    <p className="text-sm text-zinc-600">Folio: #{project.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-sm text-zinc-600">Fecha: {format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}</p>
                </div>
            </div>

            {/* Client Info */}
            <div className="mb-12">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Cliente</h3>
                <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100 grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-zinc-500 uppercase">Contacto:</p>
                        <p className="font-bold text-base">{project.company?.contactName || project.company?.name || 'Cliente por definir'}</p>

                        <p className="text-xs text-zinc-500 uppercase mt-2">Email:</p>
                        <p className="text-sm">{project.company?.email || '-'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-zinc-500 uppercase">Empresa:</p>
                        <p className="font-semibold">{project.company?.name}</p>
                        <p className="text-sm text-zinc-600">{project.company?.taxId || 'RUT N/A'}</p>
                        <p className="text-sm text-zinc-600">{project.company?.address || 'Sin dirección registrada'}</p>
                        <p className="text-sm text-zinc-600">Tel: {project.company?.phone || '-'}</p>
                    </div>
                </div>
            </div>

            {/* Scope / Description */}
            <div className="mb-12">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">Detalle del Proyecto</h3>
                <div className="prose prose-zinc max-w-none">
                    <h4 className="text-lg font-semibold">{project.name}</h4>
                    {project.scopeDetails ? (
                        <div className="whitespace-pre-wrap text-zinc-700 bg-white leading-relaxed mt-2 text-justify">
                            {project.scopeDetails}
                        </div>
                    ) : (
                        <p className="text-zinc-400 italic mt-2">Sin descripción detallada del alcance.</p>
                    )}
                </div>
            </div>

            {/* Financial Summary Table */}
            <div className="mb-12">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">Oferta Económica</h3>
                <table className="w-full text-sm">
                    <thead className="bg-zinc-50 border-y border-zinc-200">
                        <tr>
                            <th className="py-3 px-4 text-left font-semibold">SKU</th>
                            <th className="py-3 px-4 text-left font-semibold">Descripción</th>
                            <th className="py-3 px-4 text-center font-semibold w-24">Cant.</th>
                            <th className="py-3 px-4 text-right font-semibold w-40">Precio Unit.</th>
                            <th className="py-3 px-4 text-right font-semibold w-40">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {project.quoteItems && project.quoteItems.length > 0 ? (
                            project.quoteItems.map((item) => (
                                <tr key={item.id}>
                                    <td className="py-4 px-4 text-zinc-500 font-mono text-xs">
                                        {item.sku || '-'}
                                    </td>
                                    <td className="py-4 px-4">
                                        <p className="font-medium text-zinc-900">{item.detail}</p>
                                    </td>
                                    <td className="py-4 px-4 text-center text-zinc-600">
                                        {item.quantity} {item.unit}
                                    </td>
                                    <td className="py-4 px-4 text-right font-mono text-zinc-600">
                                        ${item.priceNet.toLocaleString()}
                                    </td>
                                    <td className="py-4 px-4 text-right font-mono font-medium text-zinc-900">
                                        ${(item.priceNet * item.quantity).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="py-8 px-4 text-center text-zinc-400 italic">
                                    No hay ítems detallados en esta cotización.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="border-t-2 border-zinc-900">
                        <tr>
                            <td colSpan={3}></td>
                            <td className="py-3 px-4 text-right font-medium text-zinc-600">Subtotal Neto</td>
                            <td className="py-3 px-4 text-right font-mono font-medium">
                                ${totalNet.toLocaleString()}
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={3}></td>
                            <td className="py-3 px-4 text-right font-medium text-zinc-600">IVA ({(vatRate * 100).toFixed(0)}%)</td>
                            <td className="py-3 px-4 text-right font-mono font-medium">
                                ${vatAmount.toLocaleString()}
                            </td>
                        </tr>
                        <tr className="text-lg">
                            <td colSpan={3}></td>
                            <td className="py-4 px-4 text-right font-bold text-zinc-900">TOTAL</td>
                            <td className="py-4 px-4 text-right font-mono font-bold text-zinc-900">
                                ${totalGross.toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Terms & Conditions */}
            <div className="mt-auto pt-8 border-t border-zinc-200 text-sm text-zinc-500">
                <h4 className="font-semibold text-zinc-900 mb-2">Términos y Condiciones</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Validez de la oferta: 15 días hábiles.</li>
                    <li>Forma de pago: 50% anticipo, 50% contra entrega conforme.</li>
                    <li>Plazo estimado de ejecución: {project.plannedEndDate ? format(new Date(project.plannedEndDate), "d 'de' MMMM, yyyy", { locale: es }) : 'A definir'}.</li>
                </ul>
            </div>

            {/* Footer Signature Area */}
            <div className="absolute bottom-[20mm] left-[20mm] right-[20mm] grid grid-cols-2 gap-16 mt-20">
                <div className="border-t border-zinc-300 pt-4 text-center">
                    <p className="font-semibold text-zinc-900">TechProyect SpA</p>
                    <p className="text-xs text-zinc-500">Proveedor</p>
                </div>
                <div className="border-t border-zinc-300 pt-4 text-center">
                    <p className="font-semibold text-zinc-900">Aceptación Cliente</p>
                    <p className="text-xs text-zinc-500">Firma y Timbre</p>
                </div>
            </div>
        </div>
    );
}
