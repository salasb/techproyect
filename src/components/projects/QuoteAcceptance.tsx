'use client'

import { useState } from "react";
import { toggleQuoteAcceptance } from "@/app/actions/quotes";
import { useToast } from "@/components/ui/Toast";
import { Loader2, Stamp } from "lucide-react";

interface Props {
    projectId: string;
    initialAccepted: boolean;
}

export function QuoteAcceptance({ projectId, initialAccepted }: Props) {
    const [isAccepted, setIsAccepted] = useState(initialAccepted);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setIsLoading(true);
        // Optimistic update
        setIsAccepted(checked);

        try {
            await toggleQuoteAcceptance(projectId, checked);
            toast({
                type: 'success',
                message: checked ? "Cotización Aceptada: Timbre generado." : "Aceptación Revocada: Timbre eliminado."
            });
        } catch (error) {
            // Revert on error
            setIsAccepted(!checked);
            toast({
                type: 'error',
                message: "No se pudo actualizar el estado. Intente nuevamente."
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center space-x-4 bg-white dark:bg-zinc-800 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm print:hidden">
            <div className={`p-2 rounded-full transition-colors ${isAccepted ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
                <Stamp className="w-5 h-5" />
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <label htmlFor="quote-acceptance-toggle" className="font-medium cursor-pointer select-none text-sm text-foreground">
                        Aceptación Digital
                    </label>
                    {isLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                </div>
                <p className="text-[10px] text-muted-foreground">
                    {isAccepted
                        ? "Timbre visible en el documento."
                        : "Habilitar para mostrar timbre."}
                </p>
            </div>

            {/* Custom Switch Implementation since UI component is missing */}
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    id="quote-acceptance-toggle"
                    className="sr-only peer"
                    checked={isAccepted}
                    onChange={handleToggle}
                    disabled={isLoading}
                />
                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
        </div>
    );
}
