"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/app/actions/projects";
import { Loader2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type Company = {
    id: string;
    name: string;
}

type Client = {
    id: string;
    name: string;
}

export function CreateProjectForm({ companies, clients = [] }: { companies: Company[], clients?: Client[] }) {
    const [isNewCompany, setIsNewCompany] = useState(false);
    const [selectedCompanyId, setSelectedCompanyId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = (formData: FormData) => {
        const newErrors: { [key: string]: string } = {};

        const startDate = formData.get("startDate") as string;
        if (!startDate) {
            newErrors.startDate = "La fecha de inicio es requerida";
        }

        const nextActionDate = formData.get("nextActionDate") as string;
        if (nextActionDate) {
            const start = new Date(startDate);
            const next = new Date(nextActionDate);
            if (next < start) {
                newErrors.nextActionDate = "La fecha límite no puede ser anterior al inicio";
            }
        }

        const companyId = formData.get("companyId") as string;
        if (!companyId) {
            newErrors.companyId = "Debes seleccionar un cliente";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (formData: FormData) => {
        if (!validateForm(formData)) {
            toast({ type: 'error', message: "Por favor corrige los errores antes de continuar" });
            return;
        }

        setIsLoading(true);
        toast({ type: 'loading', message: "Creando proyecto...", duration: 2000 });

        try {
            const result = await createProject(formData);
            if (result && result.success) {
                toast({ type: 'success', message: "Proyecto creado exitosamente" });
                // Slight delay to let the toast be seen before redirect
                setTimeout(() => {
                    router.push(`/projects/${result.projectId}`);
                }, 1000);
            }
        } catch (error) {
            console.error(error);
            toast({ type: 'error', message: error instanceof Error ? error.message : "Error al crear proyecto" });
            setIsLoading(false);
        }
    };

    return (
        <form action={handleSubmit} className="space-y-6 max-w-2xl bg-white dark:bg-zinc-900 p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">

            <div className="space-y-2">
                <h2 className="text-xl font-bold dark:text-white">Detalles del Proyecto</h2>
                <p className="text-sm text-zinc-500">Información básica para iniciar la cotización.</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Nombre del Proyecto <span className="text-red-500">*</span>
                    </label>
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
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Cliente / Empresa <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                            name="companyId" // We keep the name, but value will be prefixed
                            required
                            options={[
                                ...companies.filter(company =>
                                    !clients.some(client => client.name.trim().toLowerCase() === company.name.trim().toLowerCase())
                                ).map(c => ({ value: `company:${c.id}`, label: c.name })),
                                ...clients.map(c => ({ value: `client:${c.id}`, label: c.name }))
                            ]}
                            value={selectedCompanyId}
                            onChange={(val) => {
                                setSelectedCompanyId(val);
                                setIsNewCompany(false);
                                if (val) setErrors(prev => ({ ...prev, companyId: '' }));
                            }}
                            allowCreate
                            onCreateClick={() => {
                                setSelectedCompanyId("new");
                                setIsNewCompany(true);
                            }}
                            placeholder={isNewCompany ? "Nuevo Cliente (Complete nombre)" : "Seleccionar Cliente..."}
                        />
                        {errors.companyId && <p className="text-red-500 text-xs mt-1">{errors.companyId}</p>}
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
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Fecha de Inicio <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="startDate"
                            required
                            type="date"
                            defaultValue={(() => {
                                const d = new Date();
                                const year = d.getFullYear();
                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                return `${year}-${month}-${day}`;
                            })()}
                            onChange={() => setErrors(prev => ({ ...prev, startDate: '' }))}
                            className={cn(
                                "w-full px-4 py-2 rounded-lg border bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white",
                                errors.startDate ? "border-red-500 focus:ring-red-500" : "border-zinc-300 dark:border-zinc-700"
                            )}
                        />
                        {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Presupuesto (Opcional)</label>
                        <input
                            name="budget"
                            type="number"
                            placeholder="0"
                            min="0"
                            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Alcance / Descripción del Proyecto</label>
                    <textarea
                        name="scopeDetails"
                        rows={3}
                        placeholder="Descripción breve del alcance, objetivos o entregables..."
                        className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white resize-none"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Próxima Acción (Inicial)</label>
                        <input
                            name="nextAction"
                            type="text"
                            defaultValue="Enviar Cotización"
                            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Este será el estado inicial para dar seguimiento en el tablero.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Fecha Límite (2 días)</label>
                        <input
                            name="nextActionDate"
                            type="date"
                            defaultValue={(() => {
                                const d = new Date();
                                d.setDate(d.getDate() + 2);
                                const year = d.getFullYear();
                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                return `${year}-${month}-${day}`;
                            })()}
                            onChange={() => setErrors(prev => ({ ...prev, nextActionDate: '' }))}
                            className={cn(
                                "w-full px-4 py-2 rounded-lg border bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white",
                                errors.nextActionDate ? "border-red-500 focus:ring-red-500" : "border-zinc-300 dark:border-zinc-700"
                            )}
                        />
                        {errors.nextActionDate && <p className="text-red-500 text-xs mt-1">{errors.nextActionDate}</p>}
                        <p className="text-[11px] text-muted-foreground mt-1">
                            El sistema generará una alerta si se vence esta fecha.
                        </p>
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
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Crear Proyecto
                </button>
            </div>

        </form>
    );
}

