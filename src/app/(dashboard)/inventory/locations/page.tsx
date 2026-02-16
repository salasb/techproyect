import { getLocations, deleteLocation } from "@/app/actions/locations";
import { LocationForm } from "@/components/inventory/LocationForm";
import { Button } from "@/components/ui/button";
import { MapPin, Truck, Building2, Trash2, Edit } from "lucide-react";
import { AddLocationButton } from "@/components/inventory/AddLocationButton"; // Client Wrapper for Modal
import { LocationList } from "@/components/inventory/LocationList";
import { Badge } from "@/components/ui/badge";

export const dynamic = 'force-dynamic';

export default async function LocationsPage() {
    const locations = await getLocations();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Ubicaciones</h2>
                    <p className="text-muted-foreground">Gestiona bodegas, vehículos y obras.</p>
                </div>
                <AddLocationButton />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {locations?.map((location: any) => (
                    <div key={location.id} className="relative overflow-hidden transition-all hover:shadow-md bg-card border border-border rounded-xl">
                        <div className={`absolute top-0 left-0 w-1 h-full ${location.type === 'WAREHOUSE' ? 'bg-blue-500' :
                                location.type === 'VEHICLE' ? 'bg-amber-500' : 'bg-green-500'
                            }`} />

                        <div className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
                            <h3 className="text-sm font-medium tracking-tight">
                                {location.type === 'WAREHOUSE' && 'Bodega'}
                                {location.type === 'VEHICLE' && 'Vehículo'}
                                {location.type === 'SITE' && 'Obra'}
                            </h3>
                            {location.type === 'WAREHOUSE' && <Building2 className="h-4 w-4 text-muted-foreground" />}
                            {location.type === 'VEHICLE' && <Truck className="h-4 w-4 text-muted-foreground" />}
                            {location.type === 'SITE' && <MapPin className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="p-6 pt-2">
                            <div className="text-2xl font-bold">{location.name}</div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                                {location.address || 'Sin dirección registrada'}
                            </p>

                            <div className="mt-4 flex items-center justify-between">
                                <Badge variant="outline" className={location.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : ''}>
                                    {location.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                                </Badge>

                                <div className="flex gap-2">
                                    {/* Edit Button would go here, maybe passed to client component */}
                                </div>
                            </div>
                        </div>

                        {/* We need a client component to handle edit/delete interactions */}
                        <LocationList location={location} />
                    </div>
                ))}

                {locations?.length === 0 && (
                    <div className="col-span-full text-center p-12 bg-muted/20 rounded-xl border border-dashed">
                        <MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                        <h3 className="text-lg font-medium">No hay ubicaciones registradas</h3>
                        <p className="text-muted-foreground mb-4">Comienza registrando tu primera bodega o vehículo.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
