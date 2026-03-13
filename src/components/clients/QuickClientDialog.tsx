'use client'

import { useState } from "react";
import { Loader2, UserPlus, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { createQuickClient, CreateQuickClientResult } from "@/actions/clients";
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
    const [errorState, setErrorState] = useState<{ message: string; fieldErrors?: Record<string, string>; traceId?: string } | null>(null);
    const { toast } = useToast();
    const { handleActionError } = usePaywall();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setErrorState(null);

        const formData = new FormData(e.currentTarget);
        
        try {
            const result: CreateQuickClientResult = await createQuickClient(formData);

            if (result.ok) {
                toast({
                    type: "success",
                    message: "Cliente creado exitosamente."
                });
                onClientCreated(result.client);
                onClose();
            } else {
                // Handle expected business errors
                if (result.code === 'READ_ONLY') {
                    handleActionError(`READ_ONLY_MODE:${result.message}`);
                } else {
                    setErrorState({ 
                        message: result.message, 
                        fieldErrors: result.fieldErrors,
                        traceId: result.traceId
                    });
                    
                    toast({
                        type: "error",
                        message: result.message || "No se pudo crear el cliente"
                    });
                }
            }
        } catch (err: any) {
            console.error("[QuickClientDialog] Submission error:", err);
            const traceId = `ERR-${Math.random().toString(36).substring(7).toUpperCase()}`;
            setErrorState({ message: "Ocurrió un fallo en la comunicación con el servidor.", traceId });
            toast({
                type: "error",
                message: "Ocurrió un fallo crítico en la comunicación."
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (!isLoading) {
                    setErrorState(null);
                    onClose();
                }
            }}
            title="Nuevo Cliente Rápido"
            description="Crea un prospecto rápidamente para asociarlo a este proyecto."
        >
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                {errorState && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex gap-3 text-sm text-red-800 animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">{errorState.message}</p>
                            {errorState.traceId && <p className="text-[10px] opacity-70 font-mono mt-1 uppercase tracking-tighter">Trace: {errorState.traceId}</p>}
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="name" className={errorState?.fieldErrors?.name ? "text-red-600" : ""}>Nombre o Razón Social *</Label>
                    <Input
                        id="name"
                        name="name"
                        placeholder="Ej: Constructora Delta SpA"
                        required
                        disabled={isLoading}
                        className={errorState?.fieldErrors?.name ? "border-red-300 focus-visible:ring-red-500" : ""}
                    />
                    {errorState?.fieldErrors?.name && <p className="text-[10px] text-red-600 font-bold">{errorState.fieldErrors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className={errorState?.fieldErrors?.email ? "text-red-600" : ""}>Correo</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="contacto@empresa.cl"
                            disabled={isLoading}
                            className={errorState?.fieldErrors?.email ? "border-red-300 focus-visible:ring-red-500" : ""}
                        />
                        {errorState?.fieldErrors?.email && <p className="text-[10px] text-red-600 font-bold">{errorState.fieldErrors.email}</p>}
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

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-50 mt-6">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        disabled={isLoading}
                        className="text-zinc-500"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 px-8"
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
