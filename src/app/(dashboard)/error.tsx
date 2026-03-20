'use client';

import { useEffect } from 'react';
import { RefreshCcw, Home, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('[Dashboard Boundary] Fatal Crash:', error.message, error.digest, error.stack);
    }, [error]);

    const errorMessage = error.message || '';
    const isAuthError = errorMessage.includes('UNAUTHORIZED') || error.digest?.includes('NEXT_REDIRECT');

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
            <div className="bg-rose-50 dark:bg-rose-950/20 p-6 rounded-full mb-6">
                <ShieldAlert className="w-12 h-12 text-rose-600 dark:text-rose-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {isAuthError ? 'Sesión expirada' : 'Error en el Command Center'}
            </h2>
            
            <p className="text-slate-600 dark:text-slate-400 max-w-md mb-8">
                {isAuthError 
                    ? 'Tu sesión ha terminado o no tienes permisos para ver esta sección. Por favor, vuelve a ingresar.'
                    : 'Ocurrió un problema inesperado al cargar los datos del dashboard. Nuestro equipo técnico ha sido notificado.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => reset()} className="gap-2">
                    <RefreshCcw className="w-4 h-4" />
                    Reintentar carga
                </Button>
                
                <Button variant="outline" asChild className="gap-2">
                    <Link href="/">
                        <Home className="w-4 h-4" />
                        Ir al inicio
                    </Link>
                </Button>
            </div>

            {error.digest && (
                <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 w-full max-w-xs">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                        Error Digest: {error.digest}
                    </p>
                </div>
            )}
        </div>
    );
}
