"use client";

import { useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Shield, User, XCircle, Settings2 } from "lucide-react";
import { updateMemberRoleAction, removeMemberAction } from "@/actions/team";
import { toast } from "sonner";

export function TeamMemberList({ members, currentUserId, isOwner, orgId, customRoles = [] }: any) {
    const [isPending, startTransition] = useTransition();

    const onUpdateRole = (memberId: string, role: string) => {
        startTransition(async () => {
            try {
                const result = await updateMemberRoleAction(memberId, orgId, role);
                if (result.success) toast.success("Rol actualizado");
            } catch (e: any) {
                toast.error(e.message);
            }
        });
    };

    const onRemove = (memberId: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar a este miembro?")) return;
        startTransition(async () => {
            try {
                const result = await removeMemberAction(memberId, orgId);
                if (result.success) toast.success("Miembro eliminado");
            } catch (e: any) {
                toast.error(e.message);
            }
        });
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {members.map((member: any) => (
                    <TableRow key={member.id}>
                        <TableCell className="font-medium">
                            {member.profile?.name || "N/A"}
                            {member.userId === currentUserId && " (Tú)"}
                        </TableCell>
                        <TableCell>{member.profile?.email}</TableCell>
                        <TableCell>
                            <Badge variant={member.role === 'OWNER' ? 'default' : member.customRole ? 'outline' : 'secondary'} className={member.customRole ? 'border-indigo-200 text-indigo-700 bg-indigo-50' : ''}>
                                {member.customRole ? member.customRole.name : member.role}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant={member.status === 'ACTIVE' ? 'outline' : 'secondary'}>
                                {member.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            {isOwner && member.userId !== currentUserId && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={isPending}>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Gestionar Rol</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'ADMIN')}>
                                            <Shield className="mr-2 h-4 w-4" /> Hacer Admin
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'MEMBER')}>
                                            <User className="mr-2 h-4 w-4" /> Hacer Miembro (Estándar)
                                        </DropdownMenuItem>
                                        
                                        {customRoles.length > 0 && (
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>
                                                    <Settings2 className="mr-2 h-4 w-4" /> Roles Personalizados
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuPortal>
                                                    <DropdownMenuSubContent>
                                                        {customRoles.map((role: any) => (
                                                            <DropdownMenuItem key={role.id} onClick={() => onUpdateRole(member.id, role.id)}>
                                                                {role.name}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuPortal>
                                            </DropdownMenuSub>
                                        )}
                                        
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => onRemove(member.id)}
                                        >
                                            <XCircle className="mr-2 h-4 w-4" /> Eliminar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
