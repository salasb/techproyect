'use client'

import { useState } from "react";
import { createProject } from "@/app/actions/projects";
import { Loader2 } from "lucide-react";

type Company = {
    id: string;
    name: string;
}

export function CreateProjectForm({ companies }: { companies: Company[] }) {
    const [isNewCompany, setIsNewCompany] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        // Server action is called directly by form action, but we wrap to show loading state if needed
        // However, with standard action prop, loading is handled by useFormStatus usually.
        // For simplicity, we'll let the form submit naturally but standard approach is useTransition or useFormStatus.
        // Here we just submit.
        await createProject(formData);
    };

    return (
        <form action={createProject} onSubmit={() => setIsLoading(true)} className="space-y-6 max-w-2xl bg-white dark:bg-zinc-900 p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">

            <div className="space-y-2">
                <h2 className="text-xl font-bold dark:text-white">Detalles del Proyecto</h2>
                <p className="text-sm text-zinc-500">Información básica para iniciar la cotización.</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nombre del Proyecto</label>
                    <input
                        name="name"
                        required
                        type="text"
                        placeholder="Ej: Implementación CRM"
                        className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cliente / Empresa</label>
                        <select
                            name="companyId"
                            required
                            onChange={(e) => setIsNewCompany(e.target.value === "new")}
                            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        >
                            <option value="">Seleccionar Cliente...</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                            <option value="new">+ Crear Nuevo Cliente</option>
                        </select>
                    </div>

                    {isNewCompany && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nombre Nueva Empresa</label>
                            <input
                                name="newCompanyName"
                                required={isNewCompany}
                                type="text"
                                placeholder="Nombre de la empresa"
                                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white animate-in"
                            />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha de Inicio</label>
                        <input
                            name="startDate"
                            required
                            type="date"
                            defaultValue={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Presupuesto Estimado (Opcional)</label>
                        <input
                            name="budget"
                            type="number"
                            placeholder="0"
                            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Crear Proyecto
                </button>
            </div>

        </form>
    );
}
