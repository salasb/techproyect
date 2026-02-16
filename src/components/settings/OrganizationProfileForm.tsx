'use client';

import { useToast } from "@/components/ui/Toast";
import { Database } from "@/types/supabase";
import { useState } from "react";
import { Loader2, Building2 } from "lucide-react";

type Organization = Database['public']['Tables']['Organization']['Row']

interface Props {
    organization: Organization;
    updateAction: (formData: FormData) => Promise<void>;
}

export function OrganizationProfileForm({ organization, updateAction }: Props) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        try {
            await updateAction(formData);
            toast({ type: 'success', message: "Organización actualizada correctamente" });
        } catch (error) {
            console.error(error);
            toast({ type: 'error', message: "Error al actualizar organización" });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Basic Info */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center border-b pb-2">
                        <Building2 className="w-4 h-4 mr-2" />
                        Identidad Corporativa
                    </h3>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Nombre de la Organización
                        </label>
                        <input
                            name="name"
                            type="text"
                            required
                            defaultValue={organization.name}
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                            placeholder="Ej. TechWise SpA"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            RUT / Tax ID
                        </label>
                        <input
                            name="rut"
                            type="text"
                            defaultValue={organization.rut || ''}
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                            placeholder="76.123.456-K"
                        />
                    </div>
                </div>

                {/* Branding */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center border-b pb-2">
                        Marca & Logo
                    </h3>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            URL del Logo
                        </label>
                        <input
                            name="logoUrl"
                            type="url"
                            defaultValue={organization.logoUrl || ''}
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                            placeholder="https://..."
                        />
                        <p className="text-xs text-zinc-500 mt-1">URL pública de la imagen del logo.</p>
                    </div>

                    {organization.logoUrl && (
                        <div className="mt-4 p-4 border rounded-lg bg-zinc-50 dark:bg-zinc-900 flex justify-center">
                            <img
                                src={organization.logoUrl}
                                alt="Logo Preview"
                                className="h-16 object-contain"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </form>
    );
}
