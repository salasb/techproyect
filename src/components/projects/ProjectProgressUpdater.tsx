'use client'

import { useState } from "react";
import { updateProjectSettings } from "@/app/actions/project-settings";
import { useToast } from "@/components/ui/Toast";
import { Loader2, Save } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
    projectId: string;
    initialProgress: number;
}

export function ProjectProgressUpdater({ projectId, initialProgress }: Props) {
    const [progress, setProgress] = useState(initialProgress);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    // Debounce or save on release? 
    // Ideally save on release (onMouseUp / onTouchEnd) or simple button. 
    // Given it's a critical value, let's add a small save button that appears when changed, 
    // or just save on change with debounce.
    // For simplicity and explicit action: Save on change (change event fires on commit for range? No, input fires constantly).
    // Let's use onChange to update state, and onMouseUp/onKeyUp to trigger save? 
    // Or just a small "Confirm" button if dirty.

    const hasChanged = progress !== initialProgress;

    async function handleSave() {
        if (!hasChanged) return;
        setIsSaving(true);
        try {
            await updateProjectSettings(projectId, { progress });
            toast({ type: 'success', message: `Progreso actualizado a ${progress}%` });
            // Ideally we refresh the router or context, but server actions should revalidate path associated.
        } catch (error) {
            toast({ type: 'error', message: "Error actualizando progreso" });
            setProgress(initialProgress); // Revert on error
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground">Avance Físico (Manual)</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="cursor-help bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] px-1.5 py-0.5 rounded font-medium">Editable</div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Este porcentaje define el avance global del proyecto.<br />Ajústalo manualmente según la realidad en terreno.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary">{progress}%</span>
                    {hasChanged && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded flex items-center hover:opacity-90 transition-opacity"
                        >
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                            Guardar
                        </button>
                    )}
                </div>
            </div>

            <div className="relative h-4 flex items-center">
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
            </div>
            <p className="text-[10px] text-muted-foreground">
                Desliza para actualizar el avance real del proyecto.
            </p>
        </div>
    );
}
