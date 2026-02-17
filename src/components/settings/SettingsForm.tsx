'use client';

import { useToast } from "@/components/ui/Toast";
import { Database } from "@/types/supabase";
import { useState } from "react";
import { Loader2 } from "lucide-react";

type Settings = Database['public']['Tables']['Settings']['Row']

interface Props {
    settings: Settings;
    updateSettingsAction: (formData: FormData) => Promise<void>;
}

export function SettingsForm({ settings, updateSettingsAction }: Props) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        try {
            await updateSettingsAction(formData);
            toast({ type: 'success', message: "Configuración actualizada correctamente" });
        } catch (error) {
            console.error(error);
            toast({ type: 'error', message: "Error al actualizar configuración" });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form action={handleSubmit} className="space-y-6">
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
                                defaultValue={(settings.vatRate * 100).toFixed(1)}
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
                            defaultValue={settings.defaultPaymentTermsDays || 30}
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
                            defaultValue={settings.yellowThresholdDays || 7}
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                        />
                        <p className="text-xs text-zinc-500 mt-1">Días antes de la fecha límite para cambiar el semáforo a amarillo.</p>
                    </div>

                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-zinc-900 dark:text-white">Modo Solo</label>
                                <p className="text-xs text-zinc-500">Simplifica la interfaz ocultando opciones multi-usuario y roles avanzados.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isSoloMode"
                                    defaultChecked={(settings as any).isSoloMode || false}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isLoading ? 'Guardando...' : 'Guardar Configuración'}
                </button>
            </div>
        </form>
    );
}
