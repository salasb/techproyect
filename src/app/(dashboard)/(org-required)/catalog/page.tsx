import { requirePlan } from "@/lib/auth/server-resolver";
import CatalogView from "@/components/inventory/CatalogView";

export default async function CatalogPage() {
    // Enforcement at URL level (Server Side)
    // OLA 2A-BIS: Blindaje de rutas PRO
    await requirePlan('PRO');

    return <CatalogView />;
}
