import { createClient } from "@/lib/supabase/server";
import { calculateProjectFinancials } from "@/services/financialCalculator";
import { Database } from "@/types/supabase";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PrintButton } from "@/components/common/PrintButton";
import { AutoPrint } from "@/components/common/AutoPrint";

type Settings = Database['public']['Tables']['Settings']['Row'];

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch Settings
    let { data: settings } = await supabase.from('Settings').select('*').single();
    if (!settings) settings = { vatRate: 0.19 } as Settings;

    // 2. Fetch Project
    const { data: project } = await supabase
        .from('Project')
        .select(`
            *,
            company:Company(*),
            costEntries:CostEntry(*),
            invoices:Invoice(*)
        `)
        .eq('id', id)
        .single();

    if (!project) return notFound();

    // 3. Calculate Financials
    const fin = calculateProjectFinancials(project, project.costEntries || [], project.invoices || [], settings);

    // Format currency
    const fmt = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: project.currency || 'CLP' }).format(n);

    return (
        <div className="bg-white min-h-screen text-slate-800 p-8 md:p-12 print:p-0 font-sans text-sm">
            {/* Header Section */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    {/* Logo */}
                    <div className="mb-4">
                        <img src="/techwise logo negro.png" alt="TECHWISE" className="h-12 w-auto object-contain" />
                    </div>
                    <div className="text-xs text-slate-500 font-medium leading-relaxed">
                        <p>TechWise SpA</p>
                        <p>Av. Las Condes 10465, Of. 045 A</p>
                        <p>Edif. Estoril Capital, Las Condes</p>
                        <p>Santiago, Chile</p>
                        <div className="mt-2 flex flex-col gap-0.5">
                            <a href="tel:+56984604291" className="hover:text-slate-900 transition-colors">+56 9 8460 4291</a>
                            <a href="mailto:contacto@techwise.cl" className="hover:text-slate-900 transition-colors">contacto@techwise.cl</a>
                            <a href="https://techwise.cl" target="_blank" className="hover:text-slate-900 transition-colors">www.techwise.cl</a>
                        </div>
                    </div>
                </div>

                <div className="border-2 border-slate-300 rounded-lg p-4 text-center min-w-[250px] bg-white">
                    <h1 className="text-2xl font-bold text-slate-900 uppercase">Cotización</h1>
                    <div className="mt-2 text-sm font-medium text-slate-700">
                        <p>Folio N° <span className="text-slate-900 font-bold">{project.id.slice(0, 6).toUpperCase()}</span></p>
                        <p className="mt-1">77966773-1</p>
                        <p className="uppercase font-bold">TechWise SpA</p>
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-8 shadow-sm">
                {/* Header Row */}
                <div className="bg-slate-900 text-white p-3 border-b border-slate-900 text-center text-sm font-semibold uppercase tracking-widest">
                    {project.company?.name || 'CLIENTE POR DEFINIR'}
                </div>

                {/* Grid Content */}
                <div className="grid grid-cols-2 text-xs divide-x divide-slate-100">
                    {/* Left Column */}
                    <div className="divide-y divide-slate-100">
                        <div className="grid grid-cols-[100px_1fr]">
                            <div className="bg-slate-50 p-2 font-bold text-slate-700">RUT:</div>
                            <div className="p-2">{project.company?.taxId || '-'}</div>
                        </div>
                        <div className="grid grid-cols-[100px_1fr]">
                            <div className="bg-slate-50 p-2 font-bold text-slate-700">Contacto:</div>
                            <div className="p-2 uppercase">{project.company?.contactName || project.company?.name || '-'}</div>
                        </div>
                        <div className="grid grid-cols-[100px_1fr]">
                            <div className="bg-slate-50 p-2 font-bold text-slate-700">Teléfono:</div>
                            <div className="p-2">{project.company?.phone || '-'}</div>
                        </div>
                        <div className="grid grid-cols-[100px_1fr]">
                            <div className="bg-slate-50 p-2 font-bold text-slate-700">Email:</div>
                            <div className="p-2 truncate" title={project.company?.email || ''}>{project.company?.email || '-'}</div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="divide-y divide-slate-100">
                        <div className="grid grid-cols-[100px_1fr]">
                            <div className="bg-slate-50 p-2 font-bold text-slate-700">Fecha:</div>
                            <div className="p-2">{format(new Date(), 'dd-MM-yyyy')}</div>
                        </div>
                        <div className="grid grid-cols-[100px_1fr]">
                            <div className="bg-slate-50 p-2 font-bold text-slate-700">Válido hasta:</div>
                            <div className="p-2">{format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 'dd-MM-yyyy')}</div>
                        </div>
                        <div className="grid grid-cols-[100px_1fr]">
                            <div className="bg-slate-50 p-2 font-bold text-slate-700">Condición:</div>
                            <div className="p-2">30 Días - {project.currency || 'CLP'}</div>
                        </div>
                        <div className="grid grid-cols-[100px_1fr]">
                            <div className="bg-slate-50 p-2 font-bold text-slate-700">Ejecutivo:</div>
                            <div className="p-2">Christian Salas</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-900">
                            <th className="text-left py-2 font-bold text-slate-900 w-24">SKU</th>
                            <th className="text-left py-2 font-bold text-slate-900">DETALLE</th>
                            <th className="text-center py-2 font-bold text-slate-900 w-12">CANT.</th>
                            <th className="text-center py-2 font-bold text-slate-900 w-16">UNID.</th>
                            <th className="text-right py-2 font-bold text-slate-900 w-24">UNITARIO</th>
                            <th className="text-right py-2 font-bold text-slate-900 w-24">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {/* Using cost entries as proxy for items for now, treating them as 'Global Services' if detailed items don't exist */}
                        {/* In a real scenario, we might want 'QuoteItems' separate from 'CostEntries'. 
                            For this V1, we will map cost entries or use a single summary row if it's a lump sum project. */}

                        {(project.quoteItems && project.quoteItems.length > 0) ? (
                            project.quoteItems.map((item: any) => (
                                <tr key={item.id}>
                                    <td className="py-3 text-slate-500">{item.sku || '-'}</td>
                                    <td className="py-3 font-medium text-slate-800 uppercase">{item.detail}</td>
                                    <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                                    <td className="py-3 text-center text-slate-500 text-[10px]">{item.unit}</td>
                                    <td className="py-3 text-right text-slate-600">{fmt(item.priceNet)}</td>
                                    <td className="py-3 text-right font-bold text-slate-900">{fmt(item.priceNet * item.quantity)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-slate-400 italic">No hay ítems registrados</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Totals & Disclaimer */}
            <div className="flex flex-col md:flex-row gap-8 mb-8 text-xs">
                <div className="flex-1 italic text-slate-500 text-justify">
                    Se reserva el derecho de cambiar o modificar su lista de precios sin previo aviso, corregir irregularidades u otros generados por sus empleados. En caso de una variación muy alta del dólar, será necesario volver a recalcular los valores cotizados.
                </div>
                <div className="w-full md:w-64 border border-slate-200">
                    <div className="grid grid-cols-2 border-b border-slate-200">
                        <div className="bg-blue-50 p-2 font-bold text-right">Neto:</div>
                        <div className="p-2 text-right">{fmt(fin.priceNet)}</div>
                    </div>
                    <div className="grid grid-cols-2 border-b border-slate-200">
                        <div className="bg-blue-50 p-2 font-bold text-right">IVA(19%):</div>
                        <div className="p-2 text-right">{fmt(fin.vatAmount)}</div>
                    </div>
                    <div className="grid grid-cols-2 bg-blue-100/50">
                        <div className="p-2 font-bold text-right">Total:</div>
                        <div className="p-2 text-right font-bold">{fmt(fin.priceGross)}</div>
                    </div>
                </div>
            </div>

            {/* Bank Info */}
            <div className="bg-slate-50 p-6 rounded-lg text-xs text-slate-600">
                <h4 className="font-bold text-slate-900 uppercase mb-2">Información de Pago</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p>Razón Social: <span className="font-semibold text-slate-900">TECHWISE SPA</span></p>
                        <p>RUT: <span className="font-semibold text-slate-900">77.966.773-1</span></p>
                        <p>Email: <span className="font-semibold text-slate-900">contacto@techwise.cl</span></p>
                    </div>
                    <div>
                        <p>Banco: <span className="font-semibold text-slate-900">Banco de Chile</span></p>
                        <p>Tipo Cta: <span className="font-semibold text-slate-900">Cuenta Corriente</span></p>
                        <p>N° Cuenta: <span className="font-semibold text-slate-900">1596166003</span></p>
                    </div>
                </div>
            </div>

            {/* Print Button (Screen only) */}
            <div className="fixed bottom-8 right-8 print:hidden">
                <PrintButton />
            </div>

            <AutoPrint />
        </div>
    );
}
