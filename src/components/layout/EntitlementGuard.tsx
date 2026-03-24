import { getWorkspaceState } from "@/lib/auth/workspace-resolver";
import { resolveCommercialContext } from "@/lib/billing/commercial-domain";
import { Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
    module: string;
    children: React.ReactNode;
}

export async function EntitlementGuard({ module, children }: Props) {
    const workspace = await getWorkspaceState();
    const commercial = resolveCommercialContext(workspace);

    if (!commercial.visibleModules.includes(module)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-amber-50 p-6 rounded-full dark:bg-amber-900/20">
                    <Lock className="w-12 h-12 text-amber-600 dark:text-amber-500" />
                </div>
                <div className="text-center max-w-md space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Módulo no incluido en tu plan</h2>
                    <p className="text-slate-600 dark:text-slate-400">Para acceder a esta funcionalidad, necesitas un plan superior.</p>
                </div>
                <Button asChild>
                    <Link href="/settings/billing">Ver Planes</Link>
                </Button>
            </div>
        );
    }

    return <>{children}</>;
}
