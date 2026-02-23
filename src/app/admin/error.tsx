'use client';

import { useEffect } from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[AdminErrorBoundary]', error);
    }, [error]);

    const isEnvError = error.message.includes('ADMIN_ENV_MISSING') || error.message.includes('SERVICE_ROLE_KEY');

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-inner text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-10 h-10" />
                </div>

                <h1 className="text-3xl font-black italic tracking-tighter mb-2 text-zinc-900 dark:text-white">
                    Fallo Crítico en Cockpit
                </h1>
                
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8 leading-relaxed">
                    {isEnvError 
                        ? 'La configuración de infraestructura no está completa. Faltan llaves de acceso críticas (Service Role).'
                        : 'Ha ocurrido una excepción inesperada al sincronizar el Engine de administración.'}
                </p>

                <div className="space-y-3 mb-8">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Estado del Engine</p>
                        <p className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400 break-words">
                            {error.message || 'Error de sincronización desconocido'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <Button
                        onClick={() => reset()}
                        className="w-full py-6 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black uppercase tracking-[0.15em] text-xs transition-all shadow-xl shadow-zinc-900/20 active:scale-[0.98]"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" /> Reintentar Carga
                    </Button>
                    
                    <Link 
                        href="/dashboard" 
                        className="w-full py-4 bg-white dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 text-center rounded-2xl font-bold uppercase tracking-widest text-[10px] border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-3 h-3" /> Volver al Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
