'use client';

import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
                <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl border border-zinc-100 max-w-lg text-center space-y-6">
                    <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
                        <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                    
                    <h1 className="text-3xl font-black tracking-tighter text-zinc-900 uppercase italic">Error Crítico de Sistema</h1>
                    
                    <p className="text-zinc-500 font-medium leading-relaxed">
                        Lo sentimos, ha ocurrido una excepción fatal en el núcleo de la aplicación. 
                        Nuestros ingenieros han sido alertados automáticamente.
                    </p>

                    <div className="pt-4">
                        <Button onClick={() => reset()} size="lg" className="h-14 px-8 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 font-bold uppercase text-xs tracking-widest transition-all shadow-xl">
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Reiniciar Aplicación
                        </Button>
                    </div>

                    {error.digest && (
                        <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest pt-8">
                            Digest: {error.digest}
                        </p>
                    )}
                </div>
            </body>
        </html>
    );
}
