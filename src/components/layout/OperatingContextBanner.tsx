import { getWorkspaceState } from "@/lib/auth/workspace-resolver";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { ShieldAlert, LogOut, ArrowLeft } from "lucide-react";

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
        select: { name: true }
    });

    return (
        <div className="bg-zinc-900 border-b border-white/5 px-4 py-2.5 flex items-center justify-between sticky top-0 z-[60] shadow-lg animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">
                        Modo Superadmin
                    </p>
                    <span className="hidden sm:inline text-zinc-700">•</span>
                    <p className="text-xs font-medium text-white">
                        Operando en: <span className="font-bold text-blue-400">{org?.name || 'Comercial'}</span>
                        <span className="text-zinc-500 ml-1.5 hidden md:inline">({workspace.activeOrgId.substring(0, 8)})</span>
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Link
                    href="/admin"
                    className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-[10px] font-bold text-white uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                >
                    <ArrowLeft className="w-3 h-3" />
                    Volver al Cockpit
                </Link>
                <Link
                    href="/org/select"
                    className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-md text-[10px] font-bold text-white uppercase tracking-wider transition-all shadow-lg shadow-blue-950/20"
                >
                    Cambiar
                </Link>
            </div>
        </div>
    );
}
