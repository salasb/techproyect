'use client'

import { useState } from "react";
import { toggleDigitalAcceptanceEnabled } from "@/app/actions/quotes";
import { useToast } from "@/components/ui/Toast";
import { Loader2, Stamp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
    projectId: string;
    initialAccepted: boolean; // Renamed semantically in parent if needed, maps to digitalAcceptance boolean
    isPaused?: boolean;
}

export function QuoteAcceptance({ projectId, initialAccepted, isPaused }: Props) {
    const [isEnabled, setIsEnabled] = useState(initialAccepted);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setIsLoading(true);
        // Optimistic update
        setIsEnabled(checked);

        try {
            await toggleDigitalAcceptanceEnabled(projectId, checked);
            toast({
                type: 'success',
                message: checked ? "Link público habilitado para aceptación digital." : "Link público configurado solo para visualización."
            });
        } catch (error) {
            // Revert on error
            setIsEnabled(!checked);
            toast({
                type: 'error',
                message: "No se pudo actualizar la configuración del método de aceptación."
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center space-x-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm print:hidden">
            <div className={`p-2.5 rounded-lg transition-colors ${isEnabled ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                <Stamp className="w-5 h-5" />
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <label htmlFor="quote-method-toggle" className="font-bold cursor-pointer select-none text-xs uppercase tracking-wider text-foreground">
                        Método: Aceptación Online
                    </label>
                    {isLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                    {isEnabled
                        ? "El cliente podrá Aceptar o Rechazar desde el link público."
                        : "El link público será solo de lectura (Solo PDF)."}
                </p>
            </div>

            {/* Custom Switch Implementation */}
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    id="quote-method-toggle"
                    className="sr-only peer"
                    checked={isEnabled}
                    onChange={handleToggle}
                    disabled={isLoading || isPaused}
                />
                <div className={cn(
                    "w-10 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500",
                    isPaused && "opacity-50 grayscale cursor-not-allowed"
                )}></div>
            </label>
        </div>
    );
}
