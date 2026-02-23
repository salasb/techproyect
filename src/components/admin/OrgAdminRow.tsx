'use client'

import { useState } from "react";
import { updateOrganizationStatus, updateOrganizationPlan } from "@/app/actions/admin";
import { compSubscriptionAction, extendTrialAction } from "@/app/actions/admin-actions";
import { useToast } from "@/components/ui/Toast";
import { switchWorkspaceContext } from "@/actions/workspace";
import { Users, FolderKanban, CheckCircle2, MoreVertical, ShieldAlert, Globe, CalendarPlus, Gift, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OrgData {
    id: string;
    name: string;
    status: string;
    plan: string;
    rut?: string;
    createdAt: string;
    members: { count: number }[];
    projects: { count: number }[];
}

export function OrgAdminRow({ org, availablePlans }: { org: OrgData, availablePlans: { id: string, name: string }[] }) {
    const [status, setStatus] = useState(org.status || 'ACTIVE');
    const [plan, setPlan] = useState(org.plan || 'FREE');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleStatusChange = async (newStatus: string) => {
        setIsLoading(true);
        const res = await updateOrganizationStatus(org.id, newStatus as any);
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
        const res = await updateOrganizationPlan(org.id, newPlan as any);
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
        } catch (error: unknown) {
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
        } catch (error: unknown) {
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
        } catch (error: unknown) {
            toast({ type: 'error', message: "Error de red al cambiar contexto" });
            setIsLoading(false);
        }
    };

    return (
        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${status === 'PENDING' ? 'bg-amber-100 text-amber-600' :
                        status === 'ACTIVE' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                        {org.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{org.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{org.rut || "Sin RUT"}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase inline-block w-fit ${status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                        status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                        {status}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                        Reg: {format(new Date(org.createdAt), 'dd/MM/yy', { locale: es })}
                    </span>
                </div>
            </td>
            <td className="px-6 py-4">
                <select
                    value={plan}
                    disabled={isLoading}
                    onChange={(e) => handlePlanChange(e.target.value as any)}
                    className="text-xs font-bold bg-slate-100 dark:bg-slate-800 border-none rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                    {availablePlans.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                    {!availablePlans.find(p => p.id === plan) && (
                        <option value={plan} disabled>{plan} (Legacy/Inactive)</option>
                    )}
                </select>
            </td>
            <td className="px-6 py-4 text-center">
                <div className="flex justify-center gap-4">
                    <span className="flex items-center gap-1 text-xs text-slate-500" title="Usuarios">
                        <Users className="w-3.5 h-3.5" />
                        {org.members[0]?.count || 0}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500" title="Proyectos">
                        <FolderKanban className="w-3.5 h-3.5" />
                        {org.projects[0]?.count || 0}
                    </span>
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex justify-end items-center gap-1">
                    {status === 'ACTIVE' ? (
                        <button
                            onClick={() => handleStatusChange('INACTIVE')}
                            disabled={isLoading}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Suspender Acceso"
                        >
                            <ShieldAlert className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={() => handleStatusChange('ACTIVE')}
                            disabled={isLoading}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Activar Organización"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                        </button>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger disabled={isLoading} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-blue-500">
                            <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={handleGrantComp} className="cursor-pointer flex items-center gap-2">
                                <Gift className="w-4 h-4 text-purple-500" />
                                <span>Otorgar COMP</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExtendTrial} className="cursor-pointer flex items-center gap-2">
                                <CalendarPlus className="w-4 h-4 text-amber-500" />
                                <span>Extender Trial</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleSwitchContext} className="cursor-pointer flex items-center gap-2">
                                <Globe className="w-4 h-4 text-blue-500" />
                                <span className="font-bold text-blue-600">Operar en esta Org</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </td>
        </tr>
    );
}
