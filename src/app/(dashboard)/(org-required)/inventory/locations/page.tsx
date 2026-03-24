import { requirePlan } from "@/lib/auth/server-resolver";
import LocationsView from "@/components/inventory/LocationsView";

export default async function LocationsPage() {
    // Enforcement at URL level (Server Side)
    // OLA 2A-BIS: Blindaje de rutas PRO
    await requirePlan('PRO');

    return <LocationsView />;
}
