'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertPlan } from "@/app/actions/plans";
import { Save, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

interface PlanData {
    name?: string;
    description?: string;
    price?: number;
    isActive?: boolean;
    limits?: { maxUsers?: number; maxProjects?: number };
    features?: { supportLevel?: string; canAccessAPI?: boolean; canRemoveBranding?: boolean; customDomain?: boolean };
}

interface Props {
    id: string;
    isNew: boolean;
    plan: PlanData | null;
}

export function PlanForm({ id, isNew, plan }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        try {
            const result = await upsertPlan(formData);
            if (result.success) {
                toast({ type: 'success', message: isNew ? "Plan creado con éxito" : "Plan actualizado con éxito" });
                router.push('/admin/plans');
            } else {
                toast({ type: 'error', message: "Error al guardar el plan" });
            }
        } catch (error: unknown) {
            console.error("Plan save error:", error);
            const msg = error instanceof Error ? error.message : "Error inesperado al guardar el plan";
            toast({ type: 'error', message: msg });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form action={handleSubmit} className="space-y-8">
            <input type="hidden" name="id" value={id} />

            {/* Basic Info */}
            <div className="grid gap-6 p-6 bg-white dark:bg-slate-900 rounded-xl border">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Información Básica</h3>

                {isNew && (
                    <div className="grid gap-2">
                        <Label htmlFor="newId">ID del Plan (Único, ej: ULTRA)</Label>
                        <Input id="newId" name="newId" placeholder="ULTRA" required pattern="[A-Z0-9_]+" />
                        <p className="text-xs text-muted-foreground">Solo mayúsculas y guiones bajos. No se puede cambiar después.</p>
                    </div>
                )}

                <div className="grid gap-2">
                    <Label htmlFor="name">Nombre Público</Label>
                    <Input id="name" name="name" defaultValue={plan?.name} required placeholder="Ej: Plan Enterprise" />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Input id="description" name="description" defaultValue={plan?.description} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="price">Precio (CLP)</Label>
                        <Input id="price" name="price" type="number" defaultValue={plan?.price || 0} required />
                    </div>
                    <div className="flex items-center space-x-2 pt-8">
                        <input
                            type="checkbox"
                            id="isActive"
                            name="isActive"
                            defaultChecked={plan?.isActive ?? true}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Label htmlFor="isActive">Plan Activo (Visible)</Label>
                    </div>
                </div>
            </div>

            {/* Limits */}
            <div className="grid gap-6 p-6 bg-white dark:bg-slate-900 rounded-xl border">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Límites de Uso</h3>
                <div className="grid grid-cols-3 gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="maxUsers">Máx. Usuarios (0 = Ilimitado)</Label>
                        <Input id="maxUsers" name="maxUsers" type="number" defaultValue={plan?.limits?.maxUsers || 1} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="maxProjects">Máx. Proyectos</Label>
                        <Input id="maxProjects" name="maxProjects" type="number" defaultValue={plan?.limits?.maxProjects || 2} />
                    </div>
                </div>
            </div>

            {/* Features */}
            <div className="grid gap-6 p-6 bg-white dark:bg-slate-900 rounded-xl border">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Características</h3>

                <div className="grid gap-2">
                    <Label htmlFor="supportLevel">Nivel de Soporte</Label>
                    <select
                        name="supportLevel"
                        id="supportLevel"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        defaultValue={plan?.features?.supportLevel || 'BASIC'}
                    >
                        <option value="BASIC">Básico</option>
                        <option value="PRIORITY">Prioritario</option>
                        <option value="DEDICATED">Dedicado</option>
                    </select>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <input type="checkbox" id="canAccessAPI" name="canAccessAPI" defaultChecked={plan?.features?.canAccessAPI} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <Label htmlFor="canAccessAPI">Acceso a API</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input type="checkbox" id="canRemoveBranding" name="canRemoveBranding" defaultChecked={plan?.features?.canRemoveBranding} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <Label htmlFor="canRemoveBranding">Remover Marca de Agua</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input type="checkbox" id="customDomain" name="customDomain" defaultChecked={plan?.features?.customDomain} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <Label htmlFor="customDomain">Dominio Personalizado</Label>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => router.back()}>Cancelar</Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Guardar Plan
                </Button>
            </div>
        </form>
    );
}
