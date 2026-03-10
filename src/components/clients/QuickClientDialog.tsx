'use client'

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { createQuickClient } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/Modal";
import { usePaywall } from "@/components/dashboard/PaywallContext";

interface QuickClientDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onClientCreated: (client: { id: string; name: string }) => void;
}

export function QuickClientDialog({ isOpen, onClose, onClientCreated }: QuickClientDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { handleActionError } = usePaywall();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        
        try {
            const result = await createQuickClient(formData);

            if (result.success && result.client) {
                toast({
                    type: "success",
                    message: "Cliente creado exitosamente."
                });
                onClientCreated(result.client);
                onClose();
            } else {
                if (result.code) {
                    handleActionError(`READ_ONLY_MODE:${result.error}`);
                } else {
                    toast({
                        type: "error",
                        message: result.error || "No se pudo crear el cliente"
                    });
                }
            }
        } catch (err: any) {
            console.error("[QuickClientDialog] Submission error:", err);
            toast({
                type: "error",
                message: "Ocurrió un fallo en la comunicación con el servidor."
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Nuevo Cliente Rápido"
            description="Crea un prospecto rápidamente para asociarlo a este proyecto."
        >
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nombre o Razón Social *</Label>
                    <Input
                        id="name"
                        name="name"
                        placeholder="Ej: Constructora Delta SpA"
                        required
                        disabled={isLoading}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Correo</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="contacto@empresa.cl"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                            id="phone"
                            name="phone"
                            placeholder="+56 9 ..."
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="bg-primary text-primary-foreground"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <UserPlus className="w-4 h-4 mr-2" />
                        )}
                        Crear Cliente
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
