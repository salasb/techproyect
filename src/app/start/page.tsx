"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createOrganizationAction } from "@/actions/organizations";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building2, User, CheckCircle2, AlertCircle, LogOut, ChevronRight, Sparkles, Loader2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function StartPage() {
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [bootstrapData, setBootstrapData] = useState<any>(null);
    const [selectingId, setSelectingId] = useState<string | null>(null);

    useEffect(() => {
        loadBootstrap();
    }, []);

    const loadBootstrap = async () => {
        setStatus('loading');
        try {
            console.log("[StartPage] Fetching bootstrap data...");
            const res = await fetch('/api/start/bootstrap', { 
                cache: 'no-store',
                headers: { 'Accept': 'application/json' }
            });
            
            // Check if response is HTML (likely a middleware redirect)
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("text/html")) {
                console.error("[StartPage] Bootstrap returned HTML instead of JSON. Potential redirect loop.");
                setBootstrapData({ 
                    ok: false, 
                    code: 'BOOTSTRAP_RETURNED_HTML', 
                    message: "El servidor devolvió una respuesta inesperada (HTML). Esto indica un problema de enrutamiento.",
                    traceId: 'HTML-ERR' 
                });
                setStatus('error');
                return;
            }

            const data = await res.json();
            
            if (res.status === 401 || data.code === 'SESSION_EXPIRED') {
                toast.error("Tu sesión ha expirado.");
                router.push('/login');
                return;
            }

            if (data.ok) {
                setBootstrapData(data);
                
                // Auto-enter logic (v1.5)
                if (data.shouldAutoEnter && data.activeOrgId) {
                    handleSelect(data.activeOrgId, true);
                    return;
                }
                
                setStatus('ready');
            } else {
                setBootstrapData(data);
                setStatus('error');
            }
        } catch (e: any) {
            console.error("[StartPage] Bootstrap fetch failed:", e.message);
            setBootstrapData({ ok: false, code: 'NETWORK_ERROR', message: "Error de red al conectar con el servidor.", traceId: 'NET-ERR' });
            setStatus('error');
        }
    };

    const handleSelect = async (orgId: string, isAuto = false) => {
        setSelectingId(orgId);
        const toastId = isAuto ? null : toast.loading("Estableciendo conexión segura...");
        
        try {
            const res = await fetch('/api/org/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orgId })
            });
            const data = await res.json();

            if (data.ok) {
                if (!isAuto) toast.success("Sincronizado.", { id: toastId! });
                // Force a hard navigation to ensure fresh context
                window.location.assign(data.redirectTo || '/dashboard');
            } else {
                if (!isAuto) toast.error(data.message || "Error al entrar.");
                setSelectingId(null);
                setStatus('ready');
            }
        } catch (e) {
            if (!isAuto) toast.error("Fallo de red al guardar contexto.");
            setSelectingId(null);
            setStatus('ready');
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
                <div className="text-center space-y-1">
                    <p className="font-black uppercase text-[10px] tracking-[0.3em] text-slate-400">Onboarding Safe-Harbor</p>
                    <p className="text-sm font-bold text-slate-600 italic">Sincronizando configuración central...</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        const errorMsg = bootstrapData?.message || "Error desconocido al inicializar.";
        const traceId = bootstrapData?.traceId;
        const code = bootstrapData?.code;

        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
                <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-2xl border border-rose-100 text-center space-y-8">
                    <div className="w-20 h-20 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-rose-500 rotate-3 shadow-inner">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Error Crítico</h2>
                        <p className="text-slate-500 text-sm font-medium italic leading-relaxed">{errorMsg}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 tracking-widest">
                            <span>Código</span>
                            <span>Trace ID</span>
                        </div>
                        <div className="flex justify-between items-center font-mono text-[11px] font-bold text-slate-600">
                            <span className="bg-white px-2 py-0.5 rounded border border-slate-100">{code || 'UNKNOWN'}</span>
                            <span className="bg-rose-50 px-2 py-0.5 rounded border border-rose-100 text-rose-600">{traceId || 'N/A'}</span>
                        </div>
                    </div>

                    <div className="pt-4 space-y-3">
                        <Button 
                            onClick={loadBootstrap} 
                            className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-900/20 active:scale-95 transition-all"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reintentar Conexión
                        </Button>
                        <form action={logout} className="w-full">
                            <Button type="submit" variant="ghost" className="w-full text-slate-400 font-bold uppercase text-[10px] tracking-widest h-12">
                                Volver al login
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    const orgs = bootstrapData?.orgs || [];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
            <div className="mb-12 flex flex-col items-center">
                <img src="/techwise logo negro.png" alt="TechWise" className="h-10 w-auto grayscale opacity-50" />
                <div className="mt-2 h-0.5 w-8 bg-blue-600/30 rounded-full" />
            </div>

            <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                
                <div className="lg:col-span-5 flex flex-col justify-center space-y-8 py-8 animate-in fade-in slide-in-from-left-4 duration-1000">
                    <div className="space-y-4">
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none italic uppercase">
                            Empieza <span className="text-blue-600">Hoy.</span>
                        </h1>
                        <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-sm italic">
                            Configura tu entorno de trabajo profesional en segundos.
                        </p>
                    </div>

                    <div className="space-y-6 pt-4">
                        {[
                            { title: "Multi-Org", desc: "Cambia entre empresas sin cerrar sesión." },
                            { title: "Seguridad B2B", desc: "Roles y permisos configurables por equipo." },
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 group">
                                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:border-blue-200 group-hover:shadow-lg transition-all shrink-0">
                                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="font-black uppercase text-[10px] tracking-widest text-slate-900">{item.title}</h4>
                                    <p className="text-xs text-slate-500 font-medium italic">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-7 animate-in fade-in slide-in-from-right-4 duration-1000">
                    {orgs.length > 0 ? (
                        <Card className="rounded-[3rem] shadow-2xl border-blue-50 bg-white overflow-hidden">
                            <CardHeader className="p-10 pb-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Espacios Disponibles</span>
                                </div>
                                <CardTitle className="text-3xl font-black tracking-tighter italic uppercase text-slate-900">Selecciona Entorno</CardTitle>
                            </CardHeader>
                            <CardContent className="p-10 pt-0 space-y-8">
                                <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {orgs.map((org: any) => (
                                        <button 
                                            key={org.id}
                                            disabled={!!selectingId}
                                            onClick={() => handleSelect(org.id)}
                                            className={cn(
                                                "w-full text-left p-6 rounded-3xl border transition-all group flex items-center justify-between",
                                                selectingId === org.id ? "border-blue-500 bg-blue-50/50" : "border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200 shadow-sm"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-inner">
                                                    {selectingId === org.id ? <Loader2 className="w-6 h-6 animate-spin text-blue-600" /> : <Building2 className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />}
                                                </div>
                                                <div>
                                                    <p className="font-black uppercase text-sm tracking-tight text-slate-900">{org.name}</p>
                                                    <Badge variant="outline" className="text-[8px] font-black uppercase py-0 px-1 border-blue-100 text-blue-600">{org.planStatus}</Badge>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                </div>

                                <div className="relative py-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-slate-100"></span>
                                    </div>
                                    <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-slate-400 font-bold italic">
                                        <span className="bg-white px-4 text-center">¿Necesitas otro espacio?</span>
                                    </div>
                                </div>

                                <form action={createOrganizationAction} className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input name="name" placeholder="Nombre de la nueva empresa" required className="rounded-2xl border-slate-100 bg-slate-50/50 h-12 font-bold" />
                                        <Button type="submit" variant="outline" className="rounded-2xl px-6 h-12 font-black uppercase text-[10px] border-blue-100 text-blue-600">Crear</Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="rounded-[3rem] shadow-2xl border-blue-50 bg-white overflow-hidden">
                            <CardHeader className="p-10 pb-6">
                                <CardTitle className="text-3xl font-black tracking-tighter italic uppercase text-slate-900">Crea tu Organización</CardTitle>
                                <CardDescription className="text-sm font-medium italic leading-relaxed">Define tu entorno de trabajo para comenzar a gestionar tus proyectos.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-10 pt-4">
                                <form action={createOrganizationAction} className="space-y-8">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Comercial</Label>
                                        <Input name="name" placeholder="Ej: Mi Empresa SpA" required className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold text-lg" />
                                    </div>
                                    <Button type="submit" className="w-full h-16 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-900/20 transition-all active:scale-95">
                                        Activar Espacio de Trabajo
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    <div className="mt-8 flex justify-end px-6">
                        <form action={logout}>
                            <Button type="submit" variant="ghost" className="text-slate-400 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest transition-colors">
                                <LogOut className="w-3.5 h-3.5 mr-2" /> Cerrar Sesión
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
