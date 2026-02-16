import { getLocations } from "@/app/actions/locations";
import { Button } from "@/components/ui/button";
import { MapPin, Warehouse, Truck, Building2, Package } from "lucide-react";
import { AddLocationButton } from "@/components/inventory/AddLocationButton";
import { LocationList } from "@/components/inventory/LocationList";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

export default async function LocationsPage() {
    const locations = await getLocations();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Ubicaciones</h1>
                    <p className="text-muted-foreground">Gestiona bodegas, vehículos y puntos de stock.</p>
                </div>
                <AddLocationButton />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {locations?.map((location: any) => (
                    <Card key={location.id} className="group relative overflow-hidden hover:shadow-lg transition-all border-border/50">
                        {/* Type Indicator Bar */}
                        <div className={`absolute top-0 left-0 w-1 h-full ${location.type === 'WAREHOUSE' ? 'bg-blue-500' :
                            location.type === 'VEHICLE' ? 'bg-amber-500' : 'bg-green-500'
                            }`} />

                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                                {location.type === 'WAREHOUSE' && 'Bodega'}
                                {location.type === 'VEHICLE' && 'Vehículo'}
                                {location.type === 'SITE' && 'Obra'}
                            </CardTitle>
                            {location.isDefault ? (
                                <Badge variant="default" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Principal</Badge>
                            ) : (
                                <Badge variant="outline" className="text-slate-400 font-normal">Secundaria</Badge>
                            )}
                        </CardHeader>

                        <CardContent>
                            <div className="flex items-center space-x-4 mb-4 mt-1">
                                <div className={`p-3 rounded-2xl ${location.type === 'WAREHOUSE' ? 'bg-blue-50 text-blue-600' :
                                    location.type === 'VEHICLE' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                                    }`}>
                                    {location.type === 'WAREHOUSE' && <Warehouse className="w-6 h-6" />}
                                    {location.type === 'VEHICLE' && <Truck className="w-6 h-6" />}
                                    {location.type === 'SITE' && <Building2 className="w-6 h-6" />}
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{location.name}</div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <Package className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-600">0 productos</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                                <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate max-w-[180px]">
                                    <MapPin className="w-3.5 h-3.5 opacity-70" />
                                    {location.address || "Sin dirección registrada"}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className={location.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600'}>
                                        {location.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>

                        {/* Interactive Overlay Actions */}
                        <LocationList location={location} />
                    </Card>
                ))}

                {locations?.length === 0 && (
                    <div className="col-span-full py-20 bg-slate-50/50 dark:bg-zinc-900/50 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center px-4">
                        <div className="p-4 bg-white dark:bg-zinc-800 rounded-full shadow-sm mb-4">
                            <MapPin className="h-10 w-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Inicia tu red logística</h3>
                        <p className="text-slate-500 max-w-sm mt-2">Crea bodegas, vehículos de reparto u obras para gestionar el stock de forma granular.</p>
                        <div className="mt-6">
                            <AddLocationButton />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
