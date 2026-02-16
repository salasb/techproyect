import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/current-org";
import { Plus, MapPin, Warehouse, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { LocationDialog } from "@/components/locations/LocationDialog";

export default async function LocationsPage() {
    const supabase = await createClient();
    const orgId = await getOrganizationId();

    const { data: locations } = await supabase
        .from("Location")
        .select("*, _count:ProductStock(count)")
        .eq("organizationId", orgId)
        .order("isDefault", { ascending: false });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Ubicaciones</h1>
                    <p className="text-muted-foreground">Gestiona tus bodegas, tiendas y puntos de stock.</p>
                </div>
                <LocationDialog mode="create" />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {locations?.map((location) => (
                    <Card key={location.id} className="group hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {location.name}
                            </CardTitle>
                            {location.isDefault ? (
                                <Badge variant="default" className="bg-blue-100 text-blue-700 hover:bg-blue-100">Principal</Badge>
                            ) : (
                                <Badge variant="outline" className="text-slate-500">Secundaria</Badge>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-4 mb-4">
                                <div className={`p-2 rounded-full ${location.type === 'Store' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    <Warehouse className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{0 /* TODO: count items */}</div>
                                    <p className="text-xs text-muted-foreground">Productos en stock</p>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {location.address || "Sin dirección registrada"}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
