import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, ExternalLink, ShieldCheck, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { normalizeOperationalError } from "@/lib/superadmin/error-normalizer";
import { cn } from "@/lib/utils";
import { persistGlobalSettings } from "@/app/actions/superadmin-v2";

interface PlanDisplay {
    id: string;
    name: string;
    price: number;
    interval: string;
}

export default async function AdminSettingsPage() {
    console.log("[ADMIN_SETTINGS] Loading start v4.2.3 (Reality Patch)");
    
    let plans: PlanDisplay[] = [];
    let errorState: { message: string; code: string } | null = null;
    
    const isPreview = process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development';

    try {
        const isAdminConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = isAdminConfigured ? createAdminClient() : await createClient();

        const { data, error } = await supabase
            .from('Plan')
            .select('id, name, price, interval')
            .eq('isActive', true)
            .order('price', { ascending: true });

        if (error) throw error;
        plans = (data as PlanDisplay[]) || [];
    } catch (err: unknown) {
        const normalized = normalizeOperationalError(err);
        console.error(`[ADMIN_SETTINGS][${normalized.code}] ${normalized.message}`);
        errorState = { message: normalized.message, code: normalized.code };
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20">
            
            {/* Error State Hardening (Anti-[object Object]) */}
            {errorState && (
                <div className="bg-rose-50 border border-rose-200 p-6 rounded-[2rem] flex items-start gap-4 shadow-sm animate-in zoom-in duration-300">
                    <div className="bg-rose-100 p-2 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                        <h3 className="text-rose-900 font-black uppercase text-[10px] tracking-widest mb-1">Fallo de Configuración</h3>
                        <p className="text-rose-700 text-xs font-medium leading-relaxed">{errorState.message}</p>
                        <p className="text-rose-400 text-[9px] font-mono mt-1 uppercase">Block: Settings_Master | Code: {errorState.code} | v4.2.3</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tight text-slate-800 dark:text-white uppercase tracking-tight">Parámetros Globales</h2>
                    <p className="text-slate-500 font-medium text-sm italic">Gobernanza del ecosistema TechWise v4.2.3</p>
                </div>
            </div>

            <form action={persistGlobalSettings} className="grid gap-10">
                {/* Governance Section */}
                <Card className="rounded-[3rem] border-border shadow-2xl overflow-hidden bg-card transition-all hover:shadow-blue-500/5">
                    <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border p-10">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.4em] flex items-center gap-4 text-slate-500">
                            <ShieldCheck className="w-6 h-6 text-blue-500" />
                            Control de Plataforma
                        </CardTitle>
                        <CardDescription className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2 ml-10">
                            Configuración maestra de variables de sistema.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-10 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="grid gap-3">
                                <Label htmlFor="appName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Master</Label>
                                <Input name="appName" id="appName" defaultValue="TechWise" className="rounded-2xl border-border bg-slate-50/50 dark:bg-zinc-800/50 font-bold h-12 px-6 focus:ring-4 focus:ring-blue-500/10 transition-all" />
                            </div>
                            <div className="grid gap-3">
                                <Label htmlFor="supportEmail" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Canal Soporte</Label>
                                <Input name="supportEmail" id="supportEmail" type="email" defaultValue="support@techwise.com" className="rounded-2xl border-border bg-slate-50/50 dark:bg-zinc-800/50 font-bold h-12 px-6 focus:ring-4 focus:ring-blue-500/10 transition-all" />
                            </div>
                        </div>
                        
                        <div className="pt-8 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className={cn(
                                "flex items-center gap-3 px-4 py-2 rounded-xl border transition-all",
                                isPreview ? "bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/50" : "bg-emerald-50 border-emerald-100"
                            )}>
                                {isPreview ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                                <div className="flex flex-col">
                                    <p className={cn(
                                        "text-[10px] font-black uppercase tracking-widest",
                                        isPreview ? "text-amber-700 dark:text-amber-400" : "text-emerald-700"
                                    )}>
                                        {isPreview ? 'Preview Lock Activo' : 'Motor listo para persistencia'}
                                    </p>
                                    {isPreview && (
                                        <p className="text-[8px] text-amber-600/70 dark:text-amber-500/70 font-bold uppercase">Solo lectura por restricción de entorno</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Button type="submit" disabled={isPreview} className="rounded-2xl px-10 h-12 bg-zinc-950 hover:bg-zinc-800 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale">
                                    <Save className="w-4 h-4 mr-2" />
                                    Persistir Cambios
                                </Button>
                                {isPreview && (
                                    <span className="text-[9px] text-muted-foreground font-bold italic bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                        Bloqueado: cambios globales permitidos solo en Producción.
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </form>

            <div className="grid gap-10">
                {/* Catalog Overview */}
                <Card className="rounded-[3rem] border-border shadow-xl overflow-hidden bg-card">
                    <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border p-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <CardTitle className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Catálogo Comercial</CardTitle>
                                <CardDescription className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">Planes maestros configurados.</CardDescription>
                            </div>
                            <Link href="/admin/plans">
                                <Button variant="outline" size="sm" className="rounded-2xl border-blue-500/20 text-blue-600 hover:bg-blue-50 font-black uppercase text-[9px] tracking-[0.2em] h-10 px-6">
                                    <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                    Ir a Planes
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10">
                        <div className="space-y-4">
                            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                                {plans.map((plan) => (
                                    <div key={plan.id} className="p-8 border border-border rounded-[2.5rem] bg-slate-50/30 dark:bg-zinc-800/20 shadow-inner">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="font-black text-xs uppercase tracking-[0.1em] text-slate-900 dark:text-white italic">{plan.name}</span>
                                            <Badge variant="outline" className="text-[8px] border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded-lg uppercase font-black text-slate-400 tracking-tighter">
                                                {plan.id}
                                            </Badge>
                                        </div>
                                        <div className="text-3xl font-black text-blue-600 tracking-tighter italic">
                                            ${plan.price.toLocaleString()}
                                            <span className="text-[10px] font-bold text-slate-400 ml-2 uppercase tracking-widest not-italic">/ {plan.interval}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {plans.length === 0 && !errorState && (
                                <div className="p-20 text-center border-2 border-dashed border-border rounded-[2.5rem]">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic opacity-60">Sin planes activos</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

