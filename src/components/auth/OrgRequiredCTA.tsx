"use client";

import React from "react";
import { Building2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface OrgRequiredCTAProps {
    actionName: string;
}

export function OrgRequiredCTA({ actionName }: OrgRequiredCTAProps) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-300">
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-full shadow-lg mb-6 text-zinc-400">
                <Building2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                Organización requerida
            </h3>

            <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mb-8">
                Para poder {actionName}, necesitas tener una organización activa seleccionada. Configúrala en pocos segundos.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/start">
                    <button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl font-semibold transition-all shadow-md flex items-center justify-center">
                        Crear Organización <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                </Link>

                <Link href="/org/select">
                    <button className="w-full sm:w-auto bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 px-6 py-2.5 rounded-xl font-semibold transition-all">
                        Seleccionar Existente
                    </button>
                </Link>
            </div>
        </div>
    );
}
