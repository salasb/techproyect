import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";

export default async function SettingsPage() {
    const supabase = await createClient();

    let { data: settings } = await supabase.from('Settings').select('*').single();

    // Create if not exists (should be handled by page wrapper typically, but safe check here)
    if (!settings) {
        const { data: newSettings } = await supabase.from('Settings').insert({ vatRate: 0.19, currency: 'CLP' }).select().single();
        settings = newSettings;
    }

    async function updateSettings(formData: FormData) {
        'use server'
        const supabase = await createClient();

        const vatRate = parseFloat(formData.get("vatRate") as string) / 100;
        const yellowThresholdDays = parseInt(formData.get("yellowThresholdDays") as string);
        const defaultPaymentTermsDays = parseInt(formData.get("defaultPaymentTermsDays") as string);

        await supabase.from('Settings').update({
            vatRate,
            yellowThresholdDays,
            defaultPaymentTermsDays
        }).eq('id', settings!.id);

        revalidatePath('/settings');
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Configuración del Sistema</h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">Ajusta los parámetros globales para todos tus proyectos.</p>
            </div>

            {/* Quick Access */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/settings/users" className="group bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-md flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-white">Gestión de Usuarios</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Administrar equipo y permisos</p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-blue-500 transition-colors" />
                </Link>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                <form action={updateSettings} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Financial Defaults */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center border-b pb-2">
                                Parámetros Financieros
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Tasa de IVA por Defecto (%)
                                </label>
                                <div className="relative">
                                    <input
                                        name="vatRate"
                                        type="number"
                                        step="0.1"
                                        defaultValue={(settings!.vatRate * 100).toFixed(1)}
                                        className="w-full pl-3 pr-8 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                                    />
                                    <span className="absolute right-3 top-2 text-zinc-500">%</span>
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">Afecta los cálculos de impuestos en todos los proyectos nuevos.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Días Crédito (Facturas)
                                </label>
                                <input
                                    name="defaultPaymentTermsDays"
                                    type="number"
                                    defaultValue={settings!.defaultPaymentTermsDays || 30}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                                />
                                <p className="text-xs text-zinc-500 mt-1">Días predeterminados para vencimiento de facturas.</p>
                            </div>
                        </div>

                        {/* Alerts & UX */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center border-b pb-2">
                                Alertas & Semáforos
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Umbral Alerta Amarilla (Días)
                                </label>
                                <input
                                    name="yellowThresholdDays"
                                    type="number"
                                    defaultValue={settings!.yellowThresholdDays || 7}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                                />
                                <p className="text-xs text-zinc-500 mt-1">Días antes de la fecha límite para cambiar el semáforo a amarillo.</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                            Guardar Configuración
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
