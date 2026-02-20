import { getWorkspaceState } from "@/lib/auth/workspace-resolver";
import Link from "next/link";
import prisma from "@/lib/prisma";

export async function OperatingContextBanner() {
    const workspace = await getWorkspaceState();

    // Only show the banner if: 
    // - it's a superadmin 
    // - operating in a specific org context
    if (!workspace.isSuperadmin || workspace.status !== 'ORG_ACTIVE_SELECTED' || !workspace.activeOrgId) {
        return null;
    }

    const org = await prisma.organization.findUnique({
        where: { id: workspace.activeOrgId },
        select: { name: true, mode: true }
    });

    return (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 animate-in slide-in-from-top-2 mx-4 md:mx-6 mt-4 md:mt-6">
            <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Operando contexto: <span className="font-bold text-slate-900 dark:text-white capitalize">{org?.name || 'Comercial'}</span> <span className="text-slate-400 font-normal">({workspace.activeOrgId.substring(0, 8)}...)</span>
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Link href="/org/select" className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors">
                    Cambiar Contexto
                </Link>
            </div>
        </div>
    );
}
