'use client'

import { useState } from "react";
import { Database } from "@/types/supabase";
import { updateProjectSettings } from "@/app/actions/project-settings";
import { useToast } from "@/components/ui/Toast";
import { Save, Building2, Search, Check, X, Link as LinkIcon, AlertTriangle, Loader2 } from "lucide-react";

type Project = Database['public']['Tables']['Project']['Row'] & {
    company: Database['public']['Tables']['Company']['Row']
    client?: Database['public']['Tables']['Client']['Row'] | null // Add client relation
};

interface Props {
    project: Project;
    clients: Database['public']['Tables']['Client']['Row'][];
}

export function ProjectSettings({ project, clients }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClientId, setSelectedClientId] = useState<string | null>(project.clientId);
    const [isClientLoading, setIsClientLoading] = useState(false);

    const { toast } = useToast();

    // Filter clients
    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedClient = clients.find(c => c.id === selectedClientId);

    async function handleLinkClient() {
        if (!selectedClientId) return;
        setIsClientLoading(true);
        try {
            await updateProjectSettings(project.id, { clientId: selectedClientId });
            toast({ type: 'success', message: "Cliente vinculado exitosamente" });
        } catch (error) {
            toast({ type: 'error', message: "Error vinculando cliente" });
        } finally {
            setIsClientLoading(false);
        }
    }

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        try {
            const marginPct = parseFloat(formData.get("marginPct") as string) / 100;
            const progress = parseInt(formData.get("progress") as string);
            const currency = formData.get("currency") as string;
            const nextAction = formData.get("nextAction") as string;
            const nextActionDateStr = formData.get("nextActionDate") as string;

            // Handle dates appropriately
            const nextActionDate = nextActionDateStr ? new Date(nextActionDateStr).toISOString() : null;

            await updateProjectSettings(project.id, {
                marginPct,
                progress,
                currency,
                nextAction,
                nextActionDate
            });
            toast({ type: 'success', message: "Configuración guardada exitosamente" });
        } catch (error) {
            console.error(error);
            toast({ type: 'error', message: "Error guardando configuración" });
        } finally {
            setIsLoading(false);
        }
    }

    // Prepare default date string for input type="date"
    const defaultDate = project.nextActionDate ? new Date(project.nextActionDate).toISOString().split('T')[0] : '';
    const defaultMargin = (project.marginPct * 100).toFixed(0);

    return (
        <div className="space-y-6">
            {/* Client Settings Block */}
            <div className="max-w-2xl bg-card rounded-xl border border-border p-6 shadow-sm">
                <h3 className="text-lg font-medium text-foreground mb-6 flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-zinc-500" />
                    Vincular Cliente
                </h3>

                <div className="space-y-6">
                    <div className="relative">
                        <label className="block text-sm font-medium text-foreground mb-1">Buscar Cliente</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Escribe para buscar..."
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-foreground"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onFocus={() => setSearchTerm("")}
                            />
                        </div>

                        {/* Results Dropdown */}
                        {searchTerm.length > 0 && !selectedClient && (
                            <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                                {filteredClients.length === 0 ? (
                                    <div className="p-3 text-sm text-muted-foreground">No se encontraron clientes.</div>
                                ) : (
                                    filteredClients.map(client => (
                                        <button
                                            key={client.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedClientId(client.id);
                                                setSearchTerm("");
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-muted text-sm flex items-center justify-between group"
                                        >
                                            <span>{client.name}</span>
                                            {client.id === project.clientId && <Check className="w-4 h-4 text-green-500" />}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Selected Client Preview */}
                    {selectedClient && (
                        <div className="bg-muted/30 border border-border rounded-lg p-4 animate-in fade-in">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-foreground">{selectedClient.name}</h4>
                                    <p className="text-sm text-muted-foreground">{selectedClient.taxId || 'Sin RUT'}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedClientId(null)}
                                    className="text-xs text-muted-foreground hover:text-red-500 flex items-center"
                                >
                                    <X className="w-3 h-3 mr-1" /> Deseleccionar
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-xs text-muted-foreground block">Email</span>
                                    <span>{selectedClient.email || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground block">Teléfono</span>
                                    <span>{selectedClient.phone || '-'}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-xs text-muted-foreground block">Dirección</span>
                                    <span>{selectedClient.address || '-'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t border-border flex justify-end gap-3">
                        {project.clientId && selectedClientId !== project.clientId && (
                            <span className="text-xs text-yellow-600 flex items-center mr-auto">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Cambio no guardado
                            </span>
                        )}

                        <button
                            type="button"
                            onClick={handleLinkClient}
                            disabled={isClientLoading || !selectedClientId || (selectedClientId === project.clientId)}
                            className="flex items-center px-4 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {isClientLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                            {project.clientId && selectedClientId !== project.clientId ? 'Cambiar Cliente' : 'Vincular Cliente'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Project Settings Block */}
            <div className="max-w-2xl bg-card rounded-xl border border-border p-6 shadow-sm">
                <h3 className="text-lg font-medium text-foreground mb-6 flex items-center">
                    Configuración del Proyecto
                </h3>

                <form action={handleSubmit} className="space-y-6">
                    {/* ... Existing Fields ... */}
                    <div className="space-y-6">
                        {/* Financial Settings Card */}
                        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">Financiero</h4>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Margen Objetivo (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            name="marginPct"
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="1"
                                            defaultValue={defaultMargin}
                                            className="w-full pl-3 pr-8 py-2 rounded-lg border border-input bg-background text-foreground"
                                        />
                                        <span className="absolute right-3 top-2 text-muted-foreground">%</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Esto actualizará automáticamente el precio de venta sugerido.
                                    </p>
                                </div>



                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Moneda del Proyecto
                                    </label>
                                    <select
                                        name="currency"
                                        defaultValue={project.currency || 'CLP'}
                                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                                    >
                                        <option value="CLP">Pesos Chilenos (CLP)</option>
                                        <option value="USD">Dólares (USD)</option>
                                        <option value="UF">Unidad de Fomento (UF)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Alerts & Workflow Card */}
                        <div className="bg-card rounded-xl border border-border p-6 shadow-sm h-full">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-2 flex items-center gap-2">
                                Control & Alertas
                            </h4>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Próxima Acción (Recordatorio)
                                    </label>
                                    <input
                                        name="nextAction"
                                        type="text"
                                        defaultValue={project.nextAction || ''}
                                        placeholder="Ej: Llamar cliente, Enviar cotización..."
                                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Fecha Límite Próxima Acción
                                    </label>
                                    <input
                                        name="nextActionDate"
                                        type="date"
                                        defaultValue={defaultDate}
                                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border flex justify-end">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>

            {/* DANGER ZONE */}
            <div className="max-w-2xl bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-900/50 p-6 shadow-sm">
                <h3 className="text-lg font-medium text-red-700 dark:text-red-400 mb-2 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Zona de Peligro
                </h3>
                <p className="text-sm text-red-600/80 dark:text-red-300/80 mb-6">
                    Estas acciones son destructivas y no se pueden deshacer.
                </p>

                <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-red-100 dark:border-red-900/30">
                    <div>
                        <h4 className="font-medium text-foreground text-sm">Eliminar Proyecto</h4>
                        <p className="text-xs text-muted-foreground mt-1">Elimina permanentemente este proyecto y todos sus datos asociados.</p>
                    </div>
                    <DeleteProjectButton projectId={project.id} />
                </div>
            </div>
        </div>
    );
}

import { deleteProject } from "@/app/actions/projects";

function DeleteProjectButton({ projectId }: { projectId: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    async function handleDelete() {
        if (!confirm("¿ESTÁS SEGURO? Esta acción eliminará permanentemente el proyecto y todos sus datos. No se puede deshacer.")) return;

        // Double check
        const projectNameInput = prompt("Para confirmar, escribe 'ELIMINAR' en mayúsculas:");
        if (projectNameInput !== 'ELIMINAR') {
            toast({ type: 'error', message: "Confirmación fallida. Proyecto no eliminado." });
            return;
        }

        setIsDeleting(true);
        try {
            await deleteProject(projectId);
            // Redirect happens in server action
        } catch (error: any) {
            toast({ type: 'error', message: error.message || "Error al eliminar" });
            setIsDeleting(false);
        }
    }

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
        >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Eliminar Proyecto
        </button>
    );
}

import { Trash2 } from "lucide-react";
