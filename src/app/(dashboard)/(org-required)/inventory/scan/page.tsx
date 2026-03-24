import { requirePlan } from "@/lib/auth/server-resolver";
import ScanView from "@/components/inventory/ScanView";

export default async function ScanPage() {
    // Enforcement at URL level (Server Side)
    // OLA 2A-BIS: Blindaje de rutas PRO
    await requirePlan('PRO');

    return <ScanView />;
}
