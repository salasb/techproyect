"use client";

import React from "react";
import { Building2, Plus, LogIn, Compass } from "lucide-react";
import Link from "next/link";

export function WorkspaceSetupBanner() {
    return (
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden border border-white/10 animate-in fade-in zoom-in duration-500">
            {/* Background elements */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                    <Building2 className="w-10 h-10 text-primary" />
                </div>

                <div className="flex-1 text-center md:text-left space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Bienvenido a TechProyect</h2>
                    <p className="text-zinc-400 text-lg max-w-xl">
                        Aún no tienes un espacio de trabajo activo. Configúralo ahora para empezar a gestionar tus proyectos, facturación e inventario de forma profesional.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full md:w-auto">
                    <Link href="/start" className="group">
                        <div className="bg-primary hover:bg-primary/90 text-primary-foreground p-4 rounded-xl transition-all shadow-lg hover:shadow-primary/20 hover:-translate-y-1 flex flex-col items-center justify-center text-center h-full">
                            <Plus className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="font-semibold text-sm">Crear Organización</span>
                        </div>
                    </Link>

                    <Link href="/org/select" className="group">
                        <div className="bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl transition-all hover:-translate-y-1 flex flex-col items-center justify-center text-center h-full">
                            <LogIn className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform text-zinc-400" />
                            <span className="font-semibold text-sm">Seleccionar Existente</span>
                        </div>
                    </Link>

                    <Link href="/dashboard?explore=true" className="group sm:col-span-2 lg:col-span-1">
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl transition-all hover:bg-blue-500/20 hover:-translate-y-1 flex flex-col items-center justify-center text-center h-full">
                            <Compass className="w-5 h-5 mb-2 text-blue-400 group-hover:scale-110 transition-transform" />
                            <span className="font-semibold text-sm text-blue-400">Modo Exploración</span>
                            <span className="text-[10px] text-blue-400/60 mt-1">Navega sin compromisos</span>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
