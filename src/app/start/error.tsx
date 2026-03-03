"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function StartError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[StartErrorBounday]", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-500 text-center">
                <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-inner text-rose-600 mx-auto">
                    <AlertCircle className="w-10 h-10" />
                </div>
                
                <h1 className="text-3xl font-black italic tracking-tighter mb-4 text-slate-900">Algo salió mal</h1>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium italic">
                    No pudimos cargar el asistente de configuración. Esto puede deberse a un problema temporal de conexión.
                </p>

                <div className="space-y-3">
                    <Button 
                        onClick={() => reset()}
                        className="w-full py-6 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.15em] text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98]"
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reintentar carga
                    </Button>
                    
                    <Button asChild variant="ghost" className="w-full text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                        <Link href="/login">
                            <Home className="w-3 h-3 mr-2" />
                            Volver al Inicio
                        </Link>
                    </Button>
                </div>

                {process.env.NODE_ENV !== 'production' && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <p className="text-[10px] font-mono text-rose-400 break-all bg-rose-50 p-2 rounded-lg">{error.message}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
