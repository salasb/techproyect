"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Plus, LogOut, Loader2, Sparkles, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function NoOrgOverlay() {
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorData, setErrorData] = useState<any>(null);
    const [orgs, setOrgs] = useState<any[]>([]);
    const [selectingId, setSelectingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");

    useEffect(() => {
        loadOrgs();
    }, []);

    const loadOrgs = async () => {
        setStatus('loading');
        try {
            const res = await fetch('/api/start/bootstrap', { cache: 'no-store' });
            
            // Check for HTML response (Loop detection)
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("text/html")) {
                setErrorData({ 
                    code: 'BOOTSTRAP_RETURNED_HTML', 
                    message: "El servidor devolvió HTML inesperadamente. Probablemente un bucle de redirección del middleware.",
                    traceId: 'HTML-LOOP'
                });
                setStatus('error');
                return;
            }

            const data = await res.json();
            if (data.ok) {
                setOrgs(data.orgs || []);
                setStatus('ready');
            } else {
                setErrorData(data);
                setStatus('error');
            }
        } catch (e: any) {
            setErrorData({ message: "Fallo de conexión con el servidor.", details: e.message });
            setStatus('error');
        }
    };

    const handleSelect = async (orgId: string) => {
        setSelectingId(orgId);
        const toastId = toast.loading("Sincronizando espacio...");
        try {
            const res = await fetch('/api/org/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orgId })
            });
            const data = await res.json();
            if (data.ok) {
                toast.success("Listo.", { id: toastId });
                window.location.reload(); 
            } else {
                toast.error(data.message || "Error al seleccionar organización", { id: toastId });
                setSelectingId(null);
            }
        } catch (e) {
            toast.error("Fallo de conexión", { id: toastId });
            setSelectingId(null);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOrgName.trim()) return;
        
        const toastId = toast.loading("Creando organización...");
        try {
            const { createOrganizationAction } = await import("@/actions/organizations");
            const formData = new FormData();
            formData.append("name", newOrgName);
            const result = await createOrganizationAction(formData);
            
            // Note: server action might trigger redirect, but we'll try to reload if it returns
            toast.success("Organización creada", { id: toastId });
            window.location.reload();
        } catch (e: any) {
            toast.error(e.message || "Error al crear organización", { id: toastId });
        }
    };

    if (status === 'loading') {
        return (
            <div className="fixed inset-0 z-[100] bg-white/80 dark:bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-500 italic">Sincronizando espacios...</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                <Card className="max-w-md w-full rounded-[2.5rem] p-10 shadow-2xl bg-white dark:bg-zinc-900 border border-rose-100 text-center space-y-6">
                    <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Error de Sistema</h2>
                    <p className="text-slate-500 text-sm font-medium italic leading-relaxed">
                        {errorData?.code === 'ENV_MISSING_DATABASE_URL' 
                            ? "Configuración de base de datos faltante en Preview (DATABASE_URL). Contacta a soporte/ops."
                            : errorData?.code === 'DB_UNREACHABLE'
                            ? `No pudimos conectar con la base de datos (${errorData.prismaCode || 'ERR'}). Por favor reintenta.`
                            : errorData?.message || "No pudimos inicializar tu sesión comercial."}
                    </p>
                    {errorData?.traceId && (
                        <div className="space-y-1">
                            <code className="block p-2 bg-slate-50 dark:bg-zinc-800 rounded-lg text-[10px] text-slate-400 font-mono">Trace: {errorData.traceId}</code>
                            {errorData.prismaCode && (
                                <code className="block p-1 text-[9px] text-rose-400 font-mono">Prisma: {errorData.prismaCode}</code>
                            )}
                        </div>
                    )}
                    <Button onClick={loadOrgs} className="w-full h-14 bg-blue-600 rounded-2xl font-black uppercase shadow-lg shadow-blue-900/20">
                        Reintentar
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-2xl w-full animate-in zoom-in-95 duration-300 my-auto">
                <Card className="rounded-[3rem] shadow-2xl border-none overflow-hidden bg-white dark:bg-zinc-900">
                    <CardHeader className="p-10 pb-6 bg-slate-50 dark:bg-zinc-800/50 border-b border-border/50">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Bienvenido</span>
                                </div>
                                <CardTitle className="text-3xl font-black tracking-tighter italic uppercase">Tu Espacio de Trabajo</CardTitle>
                                <CardDescription className="text-sm font-medium italic">Selecciona una organización para comenzar a operar.</CardDescription>
                            </div>
                            <div className="hidden md:block">
                                <img src="/techwise logo negro.png" alt="TechWise" className="h-8 w-auto grayscale opacity-20" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 space-y-8">
                        {orgs.length > 0 && !isCreating ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {orgs.map((org: any) => (
                                        <button 
                                            key={org.id}
                                            disabled={!!selectingId}
                                            onClick={() => handleSelect(org.id)}
                                            className={cn(
                                                "w-full text-left p-6 rounded-3xl border transition-all group flex items-center justify-between",
                                                selectingId === org.id ? "border-blue-500 bg-blue-50/50" : "border-slate-100 dark:border-zinc-800 bg-slate-50/30 hover:bg-white dark:hover:bg-zinc-800 hover:border-blue-200"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl bg-white dark:bg-zinc-700 border border-slate-100 dark:border-zinc-600 flex items-center justify-center shadow-inner",
                                                    selectingId === org.id ? "bg-blue-100" : ""
                                                )}>
                                                    {selectingId === org.id ? <Loader2 className="w-6 h-6 animate-spin text-blue-600" /> : <Building2 className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />}
                                                </div>
                                                <div>
                                                    <p className="font-black uppercase text-sm tracking-tight">{org.name}</p>
                                                    <Badge variant="outline" className="text-[8px] font-black uppercase py-0 px-1 border-blue-100 text-blue-600">{org.planStatus}</Badge>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                </div>
                                <div className="flex justify-center pt-2">
                                    <Button variant="ghost" onClick={() => setIsCreating(true)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600">
                                        <Plus className="w-3.5 h-3.5 mr-2" /> Crear nueva empresa
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleCreate} className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre de la Organización</Label>
                                    <Input 
                                        autoFocus
                                        value={newOrgName}
                                        onChange={(e) => setNewOrgName(e.target.value)}
                                        placeholder="Ej: Mi Empresa SpA" 
                                        required 
                                        className="h-14 rounded-2xl border-slate-200 bg-slate-50 dark:bg-zinc-800 font-bold text-lg focus:bg-white dark:focus:bg-zinc-950" 
                                    />
                                </div>
                                <div className="flex gap-3">
                                    {orgs.length > 0 && (
                                        <Button type="button" variant="ghost" onClick={() => setIsCreating(false)} className="h-14 rounded-2xl px-6 font-bold uppercase text-[10px] tracking-widest">
                                            Cancelar
                                        </Button>
                                    )}
                                    <Button type="submit" className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-900/20">
                                        Crear y Empezar
                                    </Button>
                                </div>
                            </form>
                        )}

                        <div className="pt-6 border-t border-border/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Sistemas Seguros</span>
                            </div>
                            <Button variant="ghost" onClick={() => window.location.assign('/api/auth/logout')} className="h-auto p-0 text-[10px] font-bold text-slate-400 hover:text-rose-600 uppercase tracking-tighter">
                                <LogOut className="w-3.5 h-3.5 mr-2" /> Cerrar Sesión
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
