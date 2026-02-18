"use client";

import React from "react";
import { Lock, Crown, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ReadOnlyModalProps {
    isOpen: boolean;
    onClose: () => void;
    variant?: 'A' | 'B';
}

export function ReadOnlyModal({ isOpen, onClose, variant = 'A' }: ReadOnlyModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-border">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                        <Lock className="w-8 h-8" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                            {variant === 'A' ? "Modo de solo lectura" : "Acceso restringido"}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {variant === 'A'
                                ? "Tu suscripción no está activa. Para realizar cambios o crear documentos, necesitas activar un plan."
                                : "Tu trial ha terminado. No pierdas el trabajo avanzado, activa tu suscripción para seguir gestionando tus proyectos."}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <Link href="/settings/billing" onClick={onClose}>
                            <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5">
                                <Crown className="w-4 h-4" />
                                Activar Plan Ahora
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </Link>
                        <button
                            onClick={onClose}
                            className="w-full py-2 text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors uppercase tracking-widest"
                        >
                            Seguir explorando (Solo lectura)
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-border flex items-center justify-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Powered by TechWise Sentinel</span>
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                </div>
            </div>
        </div>
    );
}
