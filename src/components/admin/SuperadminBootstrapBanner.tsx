'use client';

import { useState } from 'react';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { bootstrapSuperadminAction } from '@/actions/superadmin';
import { useToast } from '@/components/ui/Toast';

export function SuperadminBootstrapBanner() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleBootstrap = async () => {
        setIsLoading(true);
        const res = await bootstrapSuperadminAction();
        setIsLoading(false);
        if (res.success) {
            toast({ type: 'success', message: '¡Elevado a SUPERADMIN exitosamente!' });
            window.location.reload();
        } else {
            toast({ type: 'error', message: res.error || 'Error en bootstrap' });
        }
    };

    return (
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 mb-6 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-lg">
                    <ShieldAlert className="w-6 h-6 text-purple-300" />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-purple-50">Activación de Superadmin Disponible</h3>
                    <p className="text-sm text-purple-200">Tu correo está en la lista de accesos privilegiados. Puedes activar el panel de control global.</p>
                </div>
            </div>
            <button
                onClick={handleBootstrap}
                disabled={isLoading}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all flex items-center whitespace-nowrap disabled:opacity-50"
            >
                {isLoading ? 'Activando...' : 'Activar Panel Admin'} <ArrowRight className="w-4 h-4 ml-2" />
            </button>
        </div>
    );
}
