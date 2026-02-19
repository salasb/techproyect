import React from 'react';
import { getWorkspaceState } from '@/lib/auth/workspace-resolver';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building2, PlusCircle, LogIn } from 'lucide-react';

interface OrgGateProps {
    children: React.ReactNode;
}

/**
 * Server Component Gate for routes that REQUIRE an active organization.
 * Instead of redirecting to /start, it shows a friendly CTA overlay or page content.
 */
export default async function OrgGate({ children }: OrgGateProps) {
    const state = await getWorkspaceState();

    if (!state.activeOrgId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-blue-50 p-6 rounded-full">
                    <Building2 className="w-12 h-12 text-blue-600" />
                </div>

                <div className="text-center max-w-md space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900">Configuración requerida</h2>
                    <p className="text-slate-600">
                        Para acceder a esta sección (Proyectos, Inventario, Finanzas), necesitas activar un espacio de trabajo.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-sm">
                    <Button asChild className="h-12 bg-blue-600 hover:bg-blue-700">
                        <Link href="/start" className="flex items-center gap-2">
                            <PlusCircle className="w-4 h-4" />
                            Crear Workspace
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-12 border-slate-200">
                        <Link href="/org/select" className="flex items-center gap-2">
                            <LogIn className="w-4 h-4" />
                            Unirme a uno
                        </Link>
                    </Button>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-500">
                    <p>
                        💡 <strong>Sugerencia:</strong> Si ya eres parte de una organización, asegúrate de haberla seleccionado en el selector superior.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
