"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/app/actions/projects";
import { Loader2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { QuickClientDialog } from "@/components/clients/QuickClientDialog";

type Company = {
    id: string;
    name: string;
}

type Client = {
    id: string;
    name: string;
}

export function CreateProjectForm({ companies, clients = [] }: { companies: Company[], clients?: Client[] }) {
    const [localClients, setLocalClients] = useState<Client[]>(clients);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [selectedCompanyId, setSelectedCompanyId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    // Debug log to ensure clients are passing
    useEffect(() => {
        if (clients.length > 0 && localClients.length === 0) {
            setLocalClients(clients);
        }
    }, [clients]);

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

    const handleClientCreated = (newClient: Client) => {
        setLocalClients(prev => [...prev, newClient]);
        setSelectedCompanyId(`client:${newClient.id}`);
        setErrors(prev => ({ ...prev, companyId: '' }));
    };

    // Prepare Options
    const options = [
        ...companies.filter(company =>
            !localClients.some(client => client.name.trim().toLowerCase() === company.name.trim().toLowerCase())
        ).map(c => ({ value: `company:${c.id}`, label: c.name })),
        ...localClients.map(c => ({ value: `client:${c.id}`, label: c.name }))
    ];

    return (
        <>
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

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Cliente / Empresa <span className="text-red-500">*</span>
                            </label>
                            <SearchableSelect
                                name="companyId"
                                required
                                options={options}
                                value={selectedCompanyId}
                                onChange={(val) => {
                                    setSelectedCompanyId(val);
                                    if (val) setErrors(prev => ({ ...prev, companyId: '' }));
                                }}
                                allowCreate
                                onCreateClick={() => setIsClientModalOpen(true)}
                                placeholder="Seleccionar Cliente..."
                            />
                            {errors.companyId && <p className="text-red-500 text-xs mt-1">{errors.companyId}</p>}
                        </div>
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
                            <details className="group">
                                <summary className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 cursor-pointer select-none list-none flex items-center gap-2">
                                    <span className="decoration-dashed underline underline-offset-4 decoration-zinc-300">Presupuesto (Opcional)</span>
                                    <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 group-open:hidden">Mostrar</span>
                                </summary>
                                <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <input
                                        name="budget"
                                        type="number"
                                        placeholder="ej: 1.500.000"
                                        min="0"
                                        className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                    />
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        Este valor es referencial y no afecta los cálculos de costos reales.
                                    </p>
                                </div>
                            </details>
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

            <QuickClientDialog
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onClientCreated={handleClientCreated}
            />
        </>
    );
}

