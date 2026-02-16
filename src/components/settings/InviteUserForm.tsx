'use client';

import { useState } from 'react';
import { inviteUser } from "@/app/actions/invitations";
import { Plus, Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export function InviteUserForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const { toast } = useToast();

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setInviteLink(null);
        try {
            const result = await inviteUser(formData);
            if (result.success) {
                toast({ type: 'success', message: 'Invitación creada correctamente' });
                setInviteLink(result.debugLink);
                // Reset form? Hard with FormData, maybe ref
            }
        } catch (error: any) {
            toast({ type: 'error', message: error.message || 'Error al crear invitación' });
        } finally {
            setIsLoading(false);
        }
    }

    const copyLink = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            toast({ type: 'success', message: 'Enlace copiado al portapapeles' });
        }
    };

    return (
        <div className="bg-card border border-border rounded-xl p-6 h-fit">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Invitar Usuario
            </h3>
            <form action={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium mb-1 block">Correo Electrónico</label>
                    <input
                        name="email"
                        type="email"
                        required
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                        placeholder="colega@empresa.com"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium mb-1 block">Rol</label>
                    <select
                        name="role"
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                    >
                        <option value="USER">Usuario</option>
                        <option value="ADMIN">Administrador</option>
                    </select>
                </div>

                {inviteLink && (
                    <div className="p-3 bg-green-50/50 border border-green-200 rounded-lg text-sm">
                        <p className="text-green-800 font-medium mb-1">¡Invitación creada!</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-white px-2 py-1 rounded border border-green-100 text-xs truncate">
                                {inviteLink}
                            </code>
                            <button
                                type="button"
                                onClick={copyLink}
                                className="p-1.5 hover:bg-green-100 rounded-md text-green-700 transition-colors"
                                title="Copiar enlace"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-green-600 mt-2">
                            *Comparte este enlace con el usuario (Solo visible en desarrollo/demo)
                        </p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Invitación'}
                </button>
                <p className="text-xs text-muted-foreground mt-2">
                    El usuario recibirá un enlace para registrarse y unirse a la organización.
                </p>
            </form>
        </div>
    );
}
