"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { inviteMemberAction } from "@/actions/team";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Clipboard, Check } from "lucide-react";

export function InviteMemberForm({ orgId, canInvite, orgMode }: any) {
    const [isPending, startTransition] = useTransition();
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (orgMode !== 'TEAM') {
            toast.error("Tu organización está en modo SOLO. Cambia a modo TEAM en configuración general para invitar miembros.");
            return;
        }

        const formData = new FormData(e.currentTarget);
        formData.append("organizationId", orgId);

        startTransition(async () => {
            try {
                const result = await inviteMemberAction(formData);
                if (result.success && result.inviteLink) {
                    setInviteLink(result.inviteLink);
                    toast.success("Invitación generada con éxito");
                }
            } catch (e: any) {
                toast.error(e.message);
            }
        });
    };

    const copyToClipboard = () => {
        if (!inviteLink) return;
        const fullUrl = `${window.location.origin}${inviteLink}`;
        navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email del invitado</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="ejemplo@correo.com"
                        required
                        disabled={!canInvite || isPending}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select
                        name="role"
                        defaultValue="MEMBER"
                        disabled={!canInvite || isPending}
                        options={[
                            { value: "ADMIN", label: "Administrador" },
                            { value: "MEMBER", label: "Miembro" },
                            { value: "VIEWER", label: "Visualizador" }
                        ]}
                    />
                </div>

                <Button
                    type="submit"
                    className="w-full"
                    disabled={!canInvite || isPending}
                >
                    {isPending ? "Generando..." : "Generar Invitación"}
                </Button>
            </form>

            <Modal
                isOpen={!!inviteLink}
                onClose={() => setInviteLink(null)}
                title="Invitación Generada"
            >
                <div className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                        Copia el siguiente link y envíalo al invitado. Solo podrá ser utilizado una vez.
                    </p>
                    <div className="flex gap-2">
                        <Input
                            readOnly
                            value={inviteLink ? `${window.location.origin}${inviteLink}` : ""}
                            className="bg-muted"
                        />
                        <Button size="icon" variant="outline" onClick={copyToClipboard}>
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
                        </Button>
                    </div>
                    <Button className="w-full" onClick={() => setInviteLink(null)}>
                        Entendido
                    </Button>
                </div>
            </Modal>
        </>
    );
}
