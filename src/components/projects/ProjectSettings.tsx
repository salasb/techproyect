'use client'

import { useState } from "react";
import { Database } from "@/types/supabase";
import { updateProjectSettings } from "@/app/actions/project-settings";
import { updateCompany } from "@/app/actions/company";
import { Save, AlertTriangle, Building2 } from "lucide-react";

type Project = Database['public']['Tables']['Project']['Row'] & {
    company: Database['public']['Tables']['Company']['Row']
};

interface Props {
    project: Project;
}

export function ProjectSettings({ project }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [isCompanyLoading, setIsCompanyLoading] = useState(false);

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
            alert("Configuración guardada exitosamente");
        } catch (error) {
            console.error(error);
            alert("Error guardando configuración");
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
                    Datos del Cliente / Empresa
                </h3>
                <form action={async (formData) => {
                    setIsCompanyLoading(true);
                    try {
                        await updateCompany(project.companyId, {
                            name: formData.get('name') as string,
                            taxId: formData.get('taxId') as string,
                            address: formData.get('address') as string,
                            phone: formData.get('phone') as string,
                            email: formData.get('email') as string,
                            contactName: formData.get('contactName') as string,
                        });
                        alert("Datos de empresa actualizados");
                    } catch (e) {
                        alert("Error actualizando empresa");
                    } finally {
                        setIsCompanyLoading(false);
                    }
                }} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Razón Social</label>
                        <input
                            name="name"
                            defaultValue={project.company?.name || ''}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">RUT / Tax ID</label>
                            <input
                                name="taxId"
                                defaultValue={project.company?.taxId || ''}
                                placeholder="76.xxx.xxx-x"
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Teléfono</label>
                            <input
                                name="phone"
                                defaultValue={project.company?.phone || ''}
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Dirección</label>
                        <input
                            name="address"
                            defaultValue={project.company?.address || ''}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Email Contacto</label>
                            <input
                                name="email"
                                defaultValue={project.company?.email || ''}
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Nombre Contacto</label>
                            <input
                                name="contactName"
                                defaultValue={project.company?.contactName || ''}
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                            />
                        </div>
                    </div>
                    <div className="pt-4 border-t border-border flex justify-end">
                        <button
                            type="submit"
                            disabled={isCompanyLoading}
                            className="flex items-center px-4 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isCompanyLoading ? 'Guardando...' : 'Actualizar Cliente'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Project Settings Block */}
            <div className="max-w-2xl bg-card rounded-xl border border-border p-6 shadow-sm">
                <h3 className="text-lg font-medium text-foreground mb-6 flex items-center">
                    Configuración del Proyecto
                </h3>

                <form action={handleSubmit} className="space-y-6">
                    {/* ... Existing Fields ... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Financial Settings */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Financiero</h4>

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
                                        step="0.1"
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
                                    Avance del Proyecto (%)
                                </label>
                                <div className="relative">
                                    <input
                                        name="progress"
                                        type="number"
                                        min="0"
                                        max="100"
                                        defaultValue={project.progress || 0}
                                        className="w-full pl-3 pr-8 py-2 rounded-lg border border-input bg-background text-foreground"
                                    />
                                    <span className="absolute right-3 top-2 text-muted-foreground">%</span>
                                </div>
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

                        {/* Alerts & Workflow */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                Control & Alertas
                            </h4>

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
        </div>
    );
}
