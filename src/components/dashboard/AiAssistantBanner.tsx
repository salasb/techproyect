'use client'

import { Sparkles, ArrowRight, BrainCircuit } from "lucide-react";
import Link from "next/link";

export function AiAssistantBanner() {
    return (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white shadow-xl">
            <div className="relative z-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div className="space-y-1">
                    <h3 className="flex items-center gap-2 text-2xl font-bold">
                        <BrainCircuit className="h-6 w-6 text-violet-200" />
                        <span className="bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent">
                            Nueva IA Generativa
                        </span>
                    </h3>
                    <p className="max-w-xl text-violet-100">
                        Crea cotizaciones detalladas en segundos. Describe tu proyecto en lenguaje natural y deja que nuestra IA estructure los ítems por ti.
                    </p>
                </div>
                <div className="flex shrink-0 gap-3">
                    <Link href="/projects">
                        <button className="group flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-bold text-violet-600 shadow-md transition-all hover:bg-violet-50 hover:shadow-lg active:scale-95">
                            <Sparkles className="h-4 w-4 text-amber-400 transition-transform group-hover:rotate-12" />
                            Probar en Proyectos
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </button>
                    </Link>
                </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl transition-transform duration-1000 hover:scale-110" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-violet-500/30 blur-2xl" />
        </div>
    );
}
