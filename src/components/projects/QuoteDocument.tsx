import { format } from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";
import { Database } from "@/types/supabase";
import { FileText } from "lucide-react";

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
        <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white text-zinc-900 shadow-2xl print:shadow-none p-[20mm] relative flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-primary/20 pb-6 mb-8">
                <div>
                    <div className="relative w-56 h-20 mb-3">
                        <Image
                            src="/techwise logo negro.png"
                            alt="TechWise Logo"
                            fill
                            className="object-contain object-left"
                            priority
                        />
                    </div>
                </div>
                <div className="text-right">
                    <div className="bg-primary/5 px-4 py-2 rounded-lg border border-primary/10 inline-block mb-3">
                        <h2 className="text-xl font-bold text-primary tracking-tight">COTIZACIÓN</h2>
                        <p className="text-sm font-mono text-zinc-600">Folio: #{project.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <p className="text-sm text-zinc-500 font-medium">Fecha de Emisión</p>
                    <p className="text-base font-semibold">{format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}</p>
                </div>
            </div>

            {/* Two Column Layout: Client & Company Info */}
            <div className="grid grid-cols-2 gap-12 mb-10">
                {/* Client Box */}
                <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Cliente
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-zinc-500 uppercase font-semibold">Empresa / Razón Social</p>
                            <p className="font-bold text-lg text-zinc-900">{project.company?.name || 'Cliente General'}</p>
                            {project.company?.taxId && <p className="text-sm text-zinc-600 font-mono">{project.company?.taxId}</p>}
                        </div>
                        <div className="pt-2 border-t border-zinc-200">
                            <p className="text-xs text-zinc-500 uppercase font-semibold">Contacto</p>
                            <p className="font-medium">{project.company?.contactName || project.company?.name || 'No especificado'}</p>
                            <p className="text-sm text-zinc-600">{project.company?.email || '-'}</p>
                            <p className="text-sm text-zinc-600">{project.company?.phone || '-'}</p>
                        </div>
                    </div>
                </div>

                {/* Scope Box */}
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        Proyecto
                    </h3>
                    <div className="prose prose-sm max-w-none">
                        <h4 className="text-lg font-bold text-zinc-900 m-0">{project.name}</h4>
                        <div className="mt-4 text-sm text-zinc-600 leading-relaxed text-justify bg-white/50">
                            {project.scopeDetails || (
                                <span className="italic text-zinc-400">Sin descripción detallada del alcance del servicio.</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Summary Table */}
            <div className="mb-8 flex-grow">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase tracking-wider">Detalle Económico</h3>
                    <span className="text-xs opacity-80 font-mono hidden print:block">Moneda: CLP</span>
                </div>
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-zinc-100 border-x border-zinc-200">
                        <tr>
                            <th className="py-2 px-3 text-left font-bold text-zinc-700 w-12 border-b border-zinc-300">#</th>
                            <th className="py-2 px-3 text-left font-bold text-zinc-700 border-b border-zinc-300">Descripción / Ítem</th>
                            <th className="py-2 px-3 text-center font-bold text-zinc-700 w-20 border-b border-zinc-300">Cant.</th>
                            <th className="py-2 px-3 text-right font-bold text-zinc-700 w-28 border-b border-zinc-300">Precio Unit.</th>
                            <th className="py-2 px-3 text-right font-bold text-zinc-700 w-28 border-b border-zinc-300 bg-zinc-50">Total</th>
                        </tr>
                    </thead>
                    <tbody className="border-x border-b border-zinc-200">
                        {project.quoteItems && project.quoteItems.length > 0 ? (
                            project.quoteItems.map((item, index) => (
                                <tr key={item.id} className="even:bg-zinc-50/50">
                                    <td className="py-2 px-3 text-zinc-400 font-mono text-xs border-b border-zinc-100">
                                        {(index + 1).toString().padStart(2, '0')}
                                    </td>
                                    <td className="py-2 px-3 border-b border-zinc-100">
                                        <p className="font-medium text-zinc-900">{item.detail}</p>
                                        {item.sku && <p className="text-[10px] text-zinc-400 font-mono mt-0.5">SKU: {item.sku}</p>}
                                    </td>
                                    <td className="py-2 px-3 text-center text-zinc-600 border-b border-zinc-100">
                                        <span className="bg-zinc-100 px-2 py-1 rounded text-xs font-semibold">{item.quantity} {item.unit}</span>
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono text-zinc-600 border-b border-zinc-100">
                                        ${item.priceNet.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-medium text-zinc-900 border-b border-zinc-100 bg-zinc-50/30">
                                        ${(item.priceNet * item.quantity).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="py-12 px-4 text-center text-zinc-400">
                                    <p>No se han agregado ítems a esta cotización.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Totals Section - Compact Layout */}
                <div className="flex justify-end mt-2">
                    <div className="w-64 bg-zinc-50 rounded-xl border border-zinc-200 overflow-hidden text-sm">
                        <div className="p-3 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-zinc-600 font-medium">Subtotal Neto</span>
                                <span className="font-mono font-semibold">${totalNet.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-600 font-medium">IVA (19%)</span>
                                <span className="font-mono font-semibold text-zinc-500">${vatAmount.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                            </div>
                        </div>
                        <div className="bg-zinc-900 text-white p-3 flex justify-between items-center">
                            <span className="font-bold uppercase tracking-wider text-xs">Total a Pagar</span>
                            <span className="font-mono font-bold text-lg">${totalGross.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Terms & Conditions Box - Reduced Margin */}
            <div className="mt-4 mb-8 bg-zinc-50 p-5 rounded-lg border border-dashed border-zinc-300">
                <h4 className="font-bold text-zinc-800 mb-2 text-xs uppercase flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Condiciones Comerciales
                </h4>
                <ul className="text-xs text-zinc-600 space-y-1.5 pl-2">
                    <li className="flex gap-2">
                        <span className="text-zinc-400">•</span>
                        <span><strong className="text-zinc-700">Validez:</strong> 15 días hábiles desde la fecha de emisión.</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-zinc-400">•</span>
                        <span><strong className="text-zinc-700">Forma de pago:</strong> 50% anticipo, 50% contra entrega conforme.</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-zinc-400">•</span>
                        <span><strong className="text-zinc-700">Plazo de ejecución:</strong> {project.plannedEndDate ? format(new Date(project.plannedEndDate), "d 'de' MMMM, yyyy", { locale: es }) : 'A coordinar según disponibilidad'}.</span>
                    </li>
                </ul>
            </div>

            {/* Sticky Footer for Print */}
            <div className="mt-auto grid grid-cols-2 gap-16 pt-4 pb-0 print:absolute print:bottom-[15mm] print:left-[20mm] print:right-[20mm]">
                <div className="border-t-2 border-zinc-300 pt-3 text-center">
                    <p className="font-bold text-zinc-900 text-sm">Techwise SpA</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-1">Firma Proveedor</p>
                </div>
                <div className="border-t-2 border-zinc-300 pt-3 text-center">
                    <p className="font-bold text-zinc-900 text-sm">Aceptación Cliente</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-1">Firma y Timbre</p>
                </div>
            </div>
        </div>
    );
}
