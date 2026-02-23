'use client'

import { useState } from "react";
import { updateOrganizationStatus, updateOrganizationPlan } from "@/app/actions/admin";
import { compSubscriptionAction, extendTrialAction } from "@/app/actions/admin-actions";
import { useToast } from "@/components/ui/Toast";
import { switchWorkspaceContext } from "@/actions/workspace";
import { Users, FolderKanban, CheckCircle2, MoreVertical, ShieldAlert, Globe, CalendarPlus, Gift, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgCockpitSummary } from "@/lib/superadmin/cockpit-service";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const healthConfig = {
    HEALTHY: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", label: "Saludable" },
    WARNING: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50", label: "Riesgo" },
    CRITICAL: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", label: "Crítico" },
};

export function OrgAdminRow({ org, availablePlans }: { org: OrgCockpitSummary, availablePlans: { id: string, name: string }[] }) {
    const [status, setStatus] = useState(org.status || 'ACTIVE');
    const [plan, setPlan] = useState(org.plan || 'FREE');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const hStatus = org.health?.status || 'WARNING';
    const hConfig = healthConfig[hStatus as keyof typeof healthConfig] || healthConfig.WARNING;
    const HealthIcon = hConfig.icon;

    const handleStatusChange = async (newStatus: string) => {
        setIsLoading(true);
        const res = await updateOrganizationStatus(org.id, newStatus as 'PENDING' | 'ACTIVE' | 'INACTIVE');
        setIsLoading(false);
        if (res.success) {
            setStatus(newStatus);
            toast({ type: 'success', message: `Organización ${newStatus === 'ACTIVE' ? 'Activada' : 'Suspendida'}` });
        } else {
            const errorMsg = typeof res.error === 'string' ? res.error : "Error al actualizar estado";
            toast({ type: 'error', message: errorMsg });
        }
    };

    const handlePlanChange = async (newPlan: string) => {
        setIsLoading(true);
        const res = await updateOrganizationPlan(org.id, newPlan as 'FREE' | 'PRO' | 'ENTERPRISE');
        setIsLoading(false);
        if (res.success) {
            setPlan(newPlan);
            toast({ type: 'success', message: `Plan actualizado a ${newPlan}` });
        } else {
            const errorMsg = typeof res.error === 'string' ? res.error : "Error al actualizar plan";
            toast({ type: 'error', message: errorMsg });
        }
    };

    const handleGrantComp = async () => {
        if (!confirm("¿Estás seguro de otorgar acceso COMP a esta organización?")) return;
        setIsLoading(true);
        try {
            const res = await compSubscriptionAction(org.id, {
                compedUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
                compedReason: "Admin Granted"
            });
            if (res.success) {
                toast({ type: 'success', message: "Acceso COMP otorgado por 1 año" });
            } else {
                toast({ type: 'error', message: res.error || "Fallo en operación COMP" });
            }
        } catch (_error: unknown) {
            toast({ type: 'error', message: "Error inesperado al otorgar COMP" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleExtendTrial = async () => {
        const days = prompt("¿Cuántos días quieres extender el trial?", "30");
        if (!days || isNaN(parseInt(days))) return;

        setIsLoading(true);
        try {
            const res = await extendTrialAction(org.id, parseInt(days));
            if (res.success) {
                toast({ type: 'success', message: `Trial extendido por ${days} días` });
            } else {
                toast({ type: 'error', message: res.error || "Fallo al extender trial" });
            }
        } catch (_error: unknown) {
            toast({ type: 'error', message: "Error inesperado en motor de trial" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSwitchContext = async () => {
        setIsLoading(true);
        try {
            const res = await switchWorkspaceContext(org.id);
            if (res.success) {
                toast({ type: 'success', message: `Entrando a ${org.name}...` });
                window.location.href = '/dashboard';
            } else {
                const errorMsg = typeof res.error === 'string' ? res.error : "No se pudo cambiar el contexto";
                toast({ type: 'error', message: errorMsg });
                setIsLoading(false);
            }
        } catch (_error: unknown) {
            toast({ type: 'error', message: "Error de red al cambiar contexto" });
            setIsLoading(false);
        }
    };

    return (
        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group border-b border-border/50 last:border-0">
            <td className="px-8 py-5">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-black italic text-sm shadow-sm border border-current/10 transition-all group-hover:scale-110",
                        status === 'PENDING' ? 'bg-amber-100 text-amber-600' :
                        status === 'ACTIVE' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                    )}>
                        {org.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <p className="font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors tracking-tight leading-none">{org.name}</p>
                            {status === 'PENDING' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">{org.rut || "Sin RUT"} | ID: {org.id.substring(0,8)}</p>
                    </div>
                </div>
            </td>
            <td className="px-8 py-5">
                <div className="space-y-1.5">
                    <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-current/10",
                        hConfig.bg, hConfig.color
                    )}>
                        <HealthIcon className="w-3 h-3" />
                        {hConfig.label} ({org.health?.score || 0}%)
                    </div>
                    {org.health?.reasons && org.health.reasons.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {org.health.reasons.map((r, idx) => (
                                <span key={idx} className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded leading-none border border-border/50">
                                    {r}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-8 py-5">
                <div className="flex flex-col gap-1.5">
                    <select
                        value={plan}
                        disabled={isLoading}
                        onChange={(e) => handlePlanChange(e.target.value)}
                        className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-inner"
                    >
                        {availablePlans.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                        {!availablePlans.find(p => p.id === plan) && (
                            <option value={plan} disabled>{plan} (Legacy)</option>
                        )}
                    </select>
                    <span className="text-[9px] text-slate-400 font-bold px-1 tracking-widest uppercase italic">
                        {status === 'ACTIVE' ? 'Operacional' : 'Restringido'}
                    </span>
                </div>
            </td>
            <td className="px-8 py-5 text-center">
                <div className="flex justify-center gap-6">
                    <div className="text-center group/stat">
                        <span className="flex items-center justify-center gap-1.5 text-xs font-black text-slate-600 dark:text-slate-300">
                            <Users className="w-3 h-3 text-slate-400" />
                            {org.metrics?.usersCount || 0}
                        </span>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Sedes</p>
                    </div>
                    <div className="text-center group/stat">
                        <span className="flex items-center justify-center gap-1.5 text-xs font-black text-blue-600">
                            <FolderKanban className="w-3 h-3 text-blue-400" />
                            {org.metrics?.projectsCount || 0}
                        </span>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Proyectos</p>
                    </div>
                </div>
            </td>
            <td className="px-8 py-5 text-right">
                <div className="flex justify-end items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger disabled={isLoading} asChild>
                            <button className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all outline-none focus:ring-2 focus:ring-blue-500 shadow-sm border border-transparent hover:border-blue-200">
                                <MoreVertical className="w-4.5 h-4.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-border shadow-2xl">
                            <DropdownMenuItem onClick={() => handleStatusChange(status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')} className="rounded-xl cursor-pointer flex items-center gap-3 p-3">
                                {status === 'ACTIVE' ? (
                                    <>
                                        <ShieldAlert className="w-4 h-4 text-red-500" />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black uppercase text-red-700 dark:text-red-400">Suspender Acceso</span>
                                            <span className="text-[9px] text-red-600/60 font-medium">Bloquear uso global</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400">Activar Nodo</span>
                                            <span className="text-[9px] text-emerald-600/60 font-medium">Habilitar operación</span>
                                        </div>
                                    </>
                                )}
                            </DropdownMenuItem>
                            <div className="h-px bg-border my-2 mx-1" />
                            <DropdownMenuItem onClick={handleGrantComp} className="rounded-xl cursor-pointer flex items-center gap-3 p-3 focus:bg-purple-50 dark:focus:bg-purple-900/20">
                                <Gift className="w-4 h-4 text-purple-500" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-black uppercase text-purple-700 dark:text-purple-400">Otorgar COMP</span>
                                    <span className="text-[9px] text-purple-600/60 font-medium">Acceso gratuito por 1 año</span>
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExtendTrial} className="rounded-xl cursor-pointer flex items-center gap-3 p-3 focus:bg-amber-50 dark:focus:bg-amber-900/20">
                                <CalendarPlus className="w-4 h-4 text-amber-500" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-400">Extender Trial</span>
                                    <span className="text-[9px] text-amber-600/60 font-medium">Añadir días de prueba</span>
                                </div>
                            </DropdownMenuItem>
                            <div className="h-px bg-border my-2 mx-1" />
                            <DropdownMenuItem onClick={handleSwitchContext} className="rounded-xl cursor-pointer flex items-center gap-3 p-3 focus:bg-blue-50 dark:focus:bg-blue-900/20">
                                <Globe className="w-4 h-4 text-blue-500" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-black uppercase text-blue-700 dark:text-blue-400">Operar en Contexto</span>
                                    <span className="text-[9px] text-blue-600/60 font-medium">Asumir identidad de esta Org</span>
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </td>
        </tr>
    );
}
