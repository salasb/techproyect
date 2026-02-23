'use client'

import { useState } from "react";
import { updateUserRole } from "@/app/actions/admin";
import { useToast } from "@/components/ui/Toast";
import { Building2, Loader2 } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    organization?: { name: string; plan: string };
}

interface UserAdminRowProps {
    user: UserProfile;
}

export function UserAdminRow({ user }: UserAdminRowProps) {
    const [role, setRole] = useState(user.role);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleRoleChange = async (newRole: string) => {
        setIsLoading(true);
        try {
            const res = await updateUserRole(user.id, newRole);
            if (res.success) {
                setRole(newRole);
                toast({ type: 'success', message: `Rol de ${user.name} actualizado a ${newRole}` });
            } else {
                const errorMsg = typeof res.error === 'string' ? res.error : "Error al actualizar rol global";
                toast({ type: 'error', message: errorMsg });
            }
        } catch (_error) {
            toast({ type: 'error', message: "Fallo de red o permisos insuficientes" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <TableRow>
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{user.name}</span>
                    <span className="text-xs text-slate-500">{user.email}</span>
                </div>
            </TableCell>
            <TableCell>
                {user.organization ? (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {user.organization.name}
                    </div>
                ) : (
                    <span className="text-slate-400 italic">Sin Organización</span>
                )}
            </TableCell>
            <TableCell>
                {user.organization?.plan ? (
                    <Badge variant="outline" className="text-xs">
                        {user.organization.plan}
                    </Badge>
                ) : (
                    <span className="text-slate-400">-</span>
                )}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <select
                        value={role}
                        disabled={isLoading}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className={`text-xs font-bold bg-slate-100 dark:bg-slate-800 border-none rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 cursor-pointer ${role === 'SUPERADMIN' ? 'text-purple-600' :
                                role === 'ADMIN' ? 'text-blue-600' :
                                    role === 'VIEWER' ? 'text-slate-500' : 'text-slate-700'
                            }`}
                    >
                        <option value="SUPERADMIN">SUPERADMIN</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="USER">USER</option>
                        <option value="VIEWER">VIEWER</option>
                    </select>
                    {isLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                </div>
            </TableCell>
            <TableCell className="text-slate-500 text-sm">
                {user.createdAt ? format(new Date(user.createdAt), "d MMM yyyy", { locale: es }) : '-'}
            </TableCell>
        </TableRow>
    );
}
