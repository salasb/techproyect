"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createTicketAction } from "@/actions/support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { TicketPriority } from "@prisma/client";

export function CreateTicketForm() {
    const router = useRouter();
    const [isPending, setIsNext] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsNext(true);

        const formData = new FormData(e.currentTarget);
        try {
            const result = await createTicketAction(formData);
            if (result.success) {
                toast.success("Ticket creado correctamente");
                router.push(`/settings/support/${result.ticketId}`);
            }
        } catch (error: any) {
            toast.error(error.message || "Error al crear el ticket");
        } finally {
            setIsNext(false);
        }
    };

    return (
        <Card className="rounded-[2rem] overflow-hidden shadow-xl border-border/50">
            <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Asunto del requerimiento</Label>
                        <Input 
                            id="title"
                            name="title"
                            required
                            placeholder="Ej: Problema con la descarga de PDF"
                            className="rounded-xl border-border bg-muted/5 focus:bg-white dark:focus:bg-zinc-950 transition-all h-12 text-lg font-bold"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="priority" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nivel de Prioridad</Label>
                        <select 
                            id="priority" 
                            name="priority"
                            className="flex h-12 w-full rounded-xl border border-input bg-muted/5 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            defaultValue={TicketPriority.P2}
                        >
                            <option value={TicketPriority.P0}>Prioridad 0 (Crítica - Bloqueo total)</option>
                            <option value={TicketPriority.P1}>Prioridad 1 (Alta - Funcionalidad parcial)</option>
                            <option value={TicketPriority.P2}>Prioridad 2 (Media - Consulta general)</option>
                            <option value={TicketPriority.P3}>Prioridad 3 (Baja - Sugerencia)</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descripción detallada</Label>
                        <Textarea 
                            id="description"
                            name="description"
                            required
                            rows={6}
                            placeholder="Describe el problema o duda lo más detallado posible..."
                            className="rounded-xl border-border bg-muted/5 focus:bg-white dark:focus:bg-zinc-950 transition-all text-base leading-relaxed"
                        />
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => router.back()}
                            className="rounded-xl text-muted-foreground font-bold uppercase text-[10px] tracking-widest"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            disabled={isPending}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest rounded-xl px-8 h-12 shadow-lg shadow-primary/20"
                        >
                            {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Enviar Ticket
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
