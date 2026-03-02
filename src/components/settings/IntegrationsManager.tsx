"use client";

import React, { useState } from "react";
import { createWebhookEndpointAction, deleteWebhookEndpointAction, getWebhookLogsAction } from "@/actions/webhooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Globe, Plus, Trash2, Key, ChevronDown, ChevronUp, History, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface WebhookEndpoint {
    id: string;
    url: string;
    description: string | null;
    events: string[];
    isActive: boolean;
    createdAt: Date;
    _count?: { logs: number };
}

export function IntegrationsManager({ initialEndpoints }: { initialEndpoints: WebhookEndpoint[] }) {
    const [endpoints, setEndpoints] = useState(initialEndpoints);
    const [isAdding, setIsNext] = useState(false);
    const [newSecret, setNewSecret] = useState<string | null>(null);
    const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState<string | null>(null);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        try {
            const result = await createWebhookEndpointAction(formData);
            if (result.success && result.secret) {
                setNewSecret(result.secret);
                toast.success("Webhook endpoint creado.");
                setIsNext(false);
                // In a real app we would refresh server component or re-fetch
                window.location.reload(); 
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este endpoint?")) return;
        try {
            await deleteWebhookEndpointAction(id);
            setEndpoints(prev => prev.filter(ep => ep.id !== id));
            toast.success("Endpoint eliminado.");
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const toggleLogs = async (id: string) => {
        if (expandedEndpoint === id) {
            setExpandedEndpoint(null);
            return;
        }

        setExpandedEndpoint(id);
        setLoadingLogs(id);
        try {
            const result = await getWebhookLogsAction(id);
            setLogs(result);
        } catch (error: any) {
            toast.error("Error al cargar logs");
        } finally {
            setLoadingLogs(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Secret Display (One-time) */}
            {newSecret && (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 space-y-4 animate-in zoom-in-95 duration-500 shadow-lg shadow-amber-500/5">
                    <div className="flex items-center gap-3 text-amber-800">
                        <Key className="w-5 h-5" />
                        <h4 className="font-black uppercase text-xs tracking-widest">Secret del Webhook (Cópialo ahora)</h4>
                    </div>
                    <p className="text-amber-700/70 text-[11px] font-medium italic">
                        Por seguridad, no podremos mostrarte este secret de nuevo. Úsalo para validar las firmas de las peticiones.
                    </p>
                    <div className="flex items-center gap-2">
                        <code className="bg-white px-4 py-3 rounded-xl border border-amber-200 font-mono text-sm select-all flex-1 shadow-inner">{newSecret}</code>
                        <Button variant="outline" className="rounded-xl h-12 bg-white hover:bg-amber-100" onClick={() => {
                            navigator.clipboard.writeText(newSecret);
                            toast.success("Copiado al portapapeles");
                        }}>Copiar</Button>
                    </div>
                    <Button variant="ghost" className="w-full text-amber-800 font-bold text-[10px] uppercase tracking-widest" onClick={() => setNewSecret(null)}>Ya lo guardé</Button>
                </div>
            )}

            {/* Endpoints List */}
            <div className="space-y-4">
                {endpoints.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-border rounded-[2rem] bg-muted/5">
                        <Globe className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">No hay servidores externos registrados.</p>
                    </div>
                ) : (
                    endpoints.map((ep) => (
                        <div key={ep.id} className="border border-border/50 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm transition-all group hover:border-blue-500/20">
                            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-2 h-2 rounded-full", ep.isActive ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-zinc-300")} />
                                        <h4 className="font-bold text-sm tracking-tight text-foreground">{ep.url}</h4>
                                        <Badge variant="outline" className="text-[8px] font-black uppercase py-0 px-1.5 border-border/50 text-muted-foreground">{ep.events.length} eventos</Badge>
                                    </div>
                                    {ep.description && <p className="text-[10px] text-muted-foreground italic ml-5">{ep.description}</p>}
                                    <p className="text-[9px] text-zinc-400 font-medium ml-5 uppercase tracking-tighter">Registrado hace {formatDistanceToNow(new Date(ep.createdAt), { locale: es })}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="rounded-xl h-9 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-blue-50 hover:text-blue-700"
                                        onClick={() => toggleLogs(ep.id)}
                                    >
                                        <History className="w-3.5 h-3.5 mr-2" />
                                        {expandedEndpoint === ep.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="rounded-xl h-9 text-rose-600 hover:bg-rose-50 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDelete(ep.id)}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Expanded Logs */}
                            {expandedEndpoint === ep.id && (
                                <div className="border-t border-border/50 bg-zinc-50 dark:bg-zinc-950/50 p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Actividad Reciente (Últimos 50 envíos)</h5>
                                        {loadingLogs && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                                    </div>
                                    
                                    {logs.length === 0 && !loadingLogs ? (
                                        <p className="text-[10px] italic text-muted-foreground text-center py-4">No se registran eventos enviados aún.</p>
                                    ) : (
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {logs.map((log, idx) => (
                                                <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-border/30 text-[10px] group/log">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "w-1.5 h-1.5 rounded-full shrink-0",
                                                            log.statusCode >= 200 && log.statusCode < 300 ? "bg-emerald-500" : "bg-rose-500"
                                                        )} />
                                                        <code className="font-bold text-zinc-700">{log.eventName}</code>
                                                        <span className="text-zinc-400 font-medium">#{log.id.substring(0,8)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className={cn(
                                                            "font-black uppercase tracking-tighter",
                                                            log.statusCode >= 200 && log.statusCode < 300 ? "text-emerald-600" : "text-rose-600"
                                                        )}>{log.statusCode || 'ERROR'}</span>
                                                        <span className="text-zinc-400 italic">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: es })}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Add New Section */}
            {!isAdding ? (
                <Button 
                    className="w-full h-14 rounded-2xl border-dashed border-2 bg-muted/5 hover:bg-muted/10 text-muted-foreground hover:text-foreground font-black uppercase text-[10px] tracking-[0.2em] border-border/50"
                    variant="outline"
                    onClick={() => setIsNext(true)}
                >
                    <Plus className="w-4 h-4 mr-2" /> Agregar Servidor Externo
                </Button>
            ) : (
                <Card className="rounded-3xl border-border bg-muted/5 overflow-hidden animate-in slide-in-from-bottom-4 duration-500 shadow-2xl">
                    <form onSubmit={handleCreate} className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">URL de Destino</Label>
                                <Input 
                                    name="url" 
                                    placeholder="https://tu-api.com/webhooks" 
                                    required 
                                    className="rounded-xl border-border/50 h-11 bg-white focus:ring-blue-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descripción (Opcional)</Label>
                                <Input 
                                    name="description" 
                                    placeholder="Ej: Servidor de BI - Analytics" 
                                    className="rounded-xl border-border/50 h-11 bg-white focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Eventos a Subscribir</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {[
                                    { id: 'quote.accepted', label: 'Cotización Aceptada' },
                                    { id: 'invoice.created', label: 'Factura Emitida' },
                                    { id: 'invoice.paid', label: 'Factura Pagada' },
                                    { id: 'payment.failed', label: 'Pago Fallido' },
                                    { id: 'ticket.created', label: 'Ticket de Soporte' },
                                    { id: '*', label: 'Todos los eventos' }
                                ].map(ev => (
                                    <label key={ev.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-white hover:border-blue-200 cursor-pointer transition-all">
                                        <input type="checkbox" name="events" value={ev.id} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="text-[10px] font-bold uppercase tracking-tight text-zinc-600">{ev.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                            <Button type="button" variant="ghost" className="rounded-xl font-bold uppercase text-[9px] tracking-widest text-muted-foreground" onClick={() => setIsNext(false)}>Cancelar</Button>
                            <Button type="submit" className="rounded-xl px-8 h-11 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20">
                                Registrar Endpoint
                            </Button>
                        </div>
                    </form>
                </Card>
            )}
        </div>
    );
}
