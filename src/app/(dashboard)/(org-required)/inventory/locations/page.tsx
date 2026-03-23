import { MapPin, Wrench } from "lucide-react";
import { EntitlementGuard } from "@/components/layout/EntitlementGuard";

export default function LocationsPage() {
    return (
        <EntitlementGuard module="locations">
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-indigo-50 p-6 rounded-full dark:bg-indigo-900/20">
                    <Wrench className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-center max-w-lg space-y-4">
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Ubicaciones (Próximamente)</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-lg">
                        Estamos construyendo el sistema de gestión multi-bodega y control logístico para tus proyectos.
                    </p>
                    <div className="pt-4 flex flex-col gap-2 items-center text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Gestión de Múltiples Bodegas
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Rastreo en Vehículos de Ruta
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Entregas directamente en Obra
                        </div>
                    </div>
                </div>
            </div>
        </EntitlementGuard>
    );
}
