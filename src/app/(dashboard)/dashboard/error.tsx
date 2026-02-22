'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("[Dashboard Crash Boundary]:", error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-500" />
                </div>
                
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                    Algo salió mal en el panel
                </h2>
                
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                    No pudimos cargar tu dashboard operativo en este momento. Hemos registrado el incidente.
                </p>

                {error.digest && (
                    <div className="mb-8 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-mono text-zinc-500 flex flex-col items-center gap-1">
                        <span className="uppercase text-[10px] font-bold text-zinc-400">Error Digest</span>
                        {error.digest}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        onClick={() => reset()}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Reintentar
                    </button>
                    
                    <Link
                        href="/org/select"
                        className="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 px-4 py-2.5 rounded-xl font-bold transition-all border border-zinc-200 dark:border-zinc-700"
                    >
                        <Home className="w-4 h-4" />
                        Cambiar Org
                    </Link>
                </div>
                
                <p className="mt-8 text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                    TechProyect Ops • Recovery Mode
                </p>
            </div>
        </div>
    );
}
