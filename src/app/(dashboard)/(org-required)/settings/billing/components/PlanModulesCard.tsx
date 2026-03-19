import { CheckCircle2, XCircle } from "lucide-react";
import { Entitlements } from "@/lib/billing/entitlements";

interface Props {
    entitlements: Entitlements;
    planName: string;
}

export function PlanModulesCard({ entitlements, planName }: Props) {
    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
            <h3 className="text-xl font-bold mb-2">Módulos de tu Plan</h3>
            <p className="text-zinc-500 text-sm mb-6">Capacidades habilitadas para tu organización según el plan <strong>{planName}</strong>.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-zinc-400 mb-4">Core Comercial (Incluido)</h4>
                    <ul className="space-y-3">
                        {['Dashboard', 'Oportunidades', 'Cotizaciones', 'Clientes', 'Proyectos', 'Calendario', 'Facturación'].map(item => (
                            <li key={item} className="flex items-center text-sm font-medium">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-3" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
                
                <div>
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-zinc-400 mb-4">Módulos Operativos</h4>
                    <ul className="space-y-3">
                        <li className="flex items-center text-sm font-medium">
                            {entitlements.canUseInventory ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-3" /> : <XCircle className="w-4 h-4 text-zinc-300 mr-3" />}
                            <span className={entitlements.canUseInventory ? '' : 'text-zinc-400 line-through'}>Inventario Completo</span>
                        </li>
                        <li className="flex items-center text-sm font-medium">
                            {entitlements.canUseCatalog ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-3" /> : <XCircle className="w-4 h-4 text-zinc-300 mr-3" />}
                            <span className={entitlements.canUseCatalog ? '' : 'text-zinc-400 line-through'}>Catálogo Avanzado</span>
                        </li>
                        <li className="flex items-center text-sm font-medium">
                            {entitlements.canUseLocations ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-3" /> : <XCircle className="w-4 h-4 text-zinc-300 mr-3" />}
                            <span className={entitlements.canUseLocations ? '' : 'text-zinc-400 line-through'}>Múltiples Bodegas</span>
                        </li>
                        <li className="flex items-center text-sm font-medium">
                            {entitlements.canUseQR ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-3" /> : <XCircle className="w-4 h-4 text-zinc-300 mr-3" />}
                            <span className={entitlements.canUseQR ? '' : 'text-zinc-400 line-through'}>Escáner QR</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}