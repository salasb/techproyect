'use client'

import { useState } from "react";
import { updateOrganizationStatus, updateOrganizationPlan } from "@/app/actions/admin";
import { useToast } from "@/components/ui/Toast";
import { Building2, Users, FolderKanban, CheckCircle2, MoreVertical, ShieldAlert, Zap, Globe } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function OrgAdminRow({ org }: { org: any }) {
    const [status, setStatus] = useState(org.status || 'ACTIVE');
    const [plan, setPlan] = useState(org.plan || 'FREE');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleStatusChange = async (newStatus: any) => {
        setIsLoading(true);
        const res = await updateOrganizationStatus(org.id, newStatus);
        setIsLoading(false);
        if (res.success) {
            setStatus(newStatus);
            toast({ type: 'success', message: `Organización ${newStatus === 'ACTIVE' ? 'Activada' : 'Suspendida'}` });
        } else {
            toast({ type: 'error', message: res.error || "Error al actualizar" });
        }
    };

    const handlePlanChange = async (newPlan: any) => {
        setIsLoading(true);
        const res = await updateOrganizationPlan(org.id, newPlan);
        setIsLoading(false);
        if (res.success) {
            setPlan(newPlan);
            toast({ type: 'success', message: `Plan actualizado a ${newPlan}` });
        } else {
            toast({ type: 'error', message: res.error || "Error al actualizar" });
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
                    <option value="FREE">Plan Free</option>
                    <option value="PRO">Plan Pro</option>
                    <option value="ENTERPRISE">Plan Enterprise</option>
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
                <div className="flex justify-end gap-2">
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
                </div>
            </td>
        </tr>
    );
}
