"use client";

import { useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { revokeInvitationAction, resendInvitationAction } from "@/actions/team"; // Agregado resend
import { toast } from "sonner";
import { XCircle, RefreshCw } from "lucide-react"; // Agregado RefreshCw

export function TeamInvitationList({ invitations, orgId }: any) {
    const [isPending, startTransition] = useTransition();

    const onRevoke = (id: string) => {
        if (!confirm("¿Deseas revocar esta invitación?")) return;
        startTransition(async () => {
            try {
                const result = await revokeInvitationAction(id, orgId);
                if (result.success) toast.success("Invitación revocada");
            } catch (e: any) {
                toast.error(e.message);
            }
        });
    };

    const onResend = (id: string) => {
        startTransition(async () => {
            try {
                const result = await resendInvitationAction(id, orgId);
                if (result.success) {
                    toast.success("Invitación reenviada");
                    if (result.inviteLink) {
                        await navigator.clipboard.writeText(result.inviteLink);
                        toast.info("Link copiado al portapapeles");
                    }
                }
            } catch (e: any) {
                toast.error(e.message);
            }
        });
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol asignado</TableHead>
                        <TableHead>Expira</TableHead>
                        <TableHead>Reseñas</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invitations.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                No hay invitaciones pendientes.
                            </TableCell>
                        </TableRow>
                    ) : (
                        invitations.map((invite: any) => (
                            <TableRow key={invite.id}>
                                <TableCell>{invite.email}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{invite.role}</Badge>
                                </TableCell>
                                <TableCell className="text-xs">
                                    {new Date(invite.expiresAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {invite.sentCount} envío(s)
                                </TableCell>
                                <TableCell className="text-right flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onResend(invite.id)}
                                        disabled={isPending}
                                        className="h-8 px-2"
                                    >
                                        <RefreshCw className={`h-3 w-3 mr-1 ${isPending ? 'animate-spin' : ''}`} /> Reenviar
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onRevoke(invite.id)}
                                        disabled={isPending}
                                        className="text-destructive h-8 px-2"
                                    >
                                        <XCircle className="h-4 w-4 mr-1" /> Revocar
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
