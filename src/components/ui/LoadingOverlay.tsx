'use client'

import { Loader2 } from "lucide-react";

interface Props {
    isVisible: boolean;
    message?: string;
}

export function LoadingOverlay({ isVisible, message = "Guardando cambios..." }: Props) {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-[2px] animate-in fade-in duration-300">
            <div className="bg-card border border-border shadow-2xl rounded-2xl p-8 flex flex-col items-center gap-4 max-w-xs w-full">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full scale-150 animate-pulse" />
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin relative z-10" />
                </div>
                <div className="text-center space-y-1">
                    <p className="font-bold text-foreground text-lg">{message}</p>
                    <p className="text-xs text-muted-foreground animate-pulse">Por favor, espera un momento.</p>
                </div>
            </div>
        </div>
    );
}
