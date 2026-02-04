'use client'

import { useState } from "react";
import { Database } from "@/types/supabase";
import { updateProjectSettings } from "@/app/actions/project-settings";
import { Edit2, Save, X } from "lucide-react";

type Project = Database['public']['Tables']['Project']['Row'];

interface Props {
    project: Project;
}

export function ProjectScope({ project }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [scope, setScope] = useState(project.scopeDetails || "");
    const [isLoading, setIsLoading] = useState(false);

    async function handleSave() {
        setIsLoading(true);
        try {
            await updateProjectSettings(project.id, {
                scopeDetails: scope
            });
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            alert("Error guardando el alcance");
        } finally {
            setIsLoading(false);
        }
    }

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm animate-in fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Editar Alcance y Detalle</h3>
                </div>
                <textarea
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    rows={8}
                    className="w-full p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Describe los entregables, características técnicas y condiciones del proyecto..."
                />
                <div className="flex justify-end space-x-2 mt-4">
                    <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                        disabled={isLoading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span> : <Save className="w-4 h-4 mr-2" />}
                        Guardar Cambios
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm group">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Alcance del Proyecto</h3>
                <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Editar Alcance"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
            </div>

            {project.scopeDetails ? (
                <div className="prose prose-zinc dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                        {project.scopeDetails}
                    </p>
                </div>
            ) : (
                <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="text-sm text-zinc-500 mb-2">No se ha definido el alcance aún.</p>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        + Agregar detalle técnico y entregables
                    </button>
                </div>
            )}
        </div>
    );
}
