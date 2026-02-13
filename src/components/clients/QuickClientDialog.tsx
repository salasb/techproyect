'use client'

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { createQuickClient } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";

export function QuickClientDialog({ isOpen, onClose, onClientCreated }: { isOpen: boolean; onClose: () => void; onClientCreated: (client: any) => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        try {
            const res = await createQuickClient(formData);
            if (res.success && res.client) {
                toast({ type: 'success', message: "Cliente creado exitosamente" });
                onClientCreated(res.client);
                onClose();
            } else {
                throw new Error(res.error || "Error desconocido");
            }
        } catch (error: any) {
            toast({ type: 'error', message: error.message || "Error al crear cliente" });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Nuevo Cliente Rápido"
            description="Crea un cliente instantáneamente para continuar."
            maxWidth="md"
        >
            <form action={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Nombre / Razón Social <span className="text-red-500">*</span></label>
                    <input
                        name="name"
                        required
                        type="text"
                        placeholder="Ej: Empresa SPA"
                        autoFocus
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm dark:text-white"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Email de Contacto</label>
                    <input
                        name="email"
                        type="email"
                        placeholder="contacto@empresa.cl"
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm dark:text-white"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Teléfono</label>
                    <input
                        name="phone"
                        type="tel"
                        placeholder="+56 9 ..."
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm dark:text-white"
                    />
                </div>

                <div className="pt-4 flex justify-end gap-3">
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
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create Cliente
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
