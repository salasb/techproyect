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

export default async function AdminSettingsPage() {
    console.log("[ADMIN_SETTINGS] Loading start v4.2.2");
    
    let plans: { id: string; name: string; price: number; interval: string }[] = [];
    let errorState: { message: string; code: string } | null = null;
    
    const isPreview = process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development';

    try {
        const isAdminConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = isAdminConfigured ? createAdminClient() : await createClient();

        const { data, error } = await supabase
            .from('Plan')
            .select('*')
            .eq('isActive', true)
            .order('price', { ascending: true });

        if (error) throw error;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        plans = (data as any[]) || [];
    } catch (err: unknown) {
        const normalized = normalizeOperationalError(err);
        errorState = { message: normalized.message, code: normalized.code };
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20">
            
            {/* Error State Hardening */}
            {errorState && (
                <div className="bg-rose-50 border border-rose-200 p-6 rounded-[2rem] flex items-start gap-4 shadow-sm animate-in zoom-in duration-300">
                    <div className="bg-rose-100 p-2 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                        <h3 className="text-rose-900 font-black uppercase text-[10px] tracking-widest mb-1">Fallo de Lectura</h3>
                        <p className="text-rose-700 text-xs font-medium leading-relaxed">{errorState.message}</p>
                        <p className="text-rose-400 text-[9px] font-mono mt-1 uppercase">CODE: {errorState.code}</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tight text-slate-800 dark:text-white uppercase tracking-tight">Ajustes del Sistema</h2>
                    <p className="text-slate-500 font-medium text-sm italic">Configuración maestra y gobernanza TechWise v4.2.2</p>
                </div>
            </div>

            <div className="grid gap-10">
                {/* Governance Section */}
                <Card className="rounded-[3rem] border-border shadow-2xl overflow-hidden bg-card transition-all hover:shadow-blue-500/5">
                    <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border p-10">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.4em] flex items-center gap-4 text-slate-500">
                            <ShieldCheck className="w-6 h-6 text-blue-500" />
                            Gobernanza Global
                        </CardTitle>
                        <CardDescription className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2 ml-10">
                            Parámetros críticos del ecosistema.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-10 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="grid gap-3">
                                <Label htmlFor="appName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre de la Plataforma</Label>
                                <Input id="appName" defaultValue="TechWise" className="rounded-2xl border-border bg-slate-50/50 dark:bg-zinc-800/50 font-bold h-12 px-6 focus:ring-4 focus:ring-blue-500/10 transition-all" />
                            </div>
                            <div className="grid gap-3">
                                <Label htmlFor="supportEmail" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Terminal de Soporte</Label>
                                <Input id="supportEmail" type="email" defaultValue="support@techwise.com" className="rounded-2xl border-border bg-slate-50/50 dark:bg-zinc-800/50 font-bold h-12 px-6 focus:ring-4 focus:ring-blue-500/10 transition-all" />
                            </div>
                        </div>
                        
                        <div className="pt-8 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-xl border border-amber-100 dark:border-amber-800/50">
                                <Lock className="w-3.5 h-3.5 text-amber-600" />
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-black uppercase tracking-widest">
                                    {isPreview ? 'Bloqueado: Cambios permitidos solo en Producción' : 'Requiere autorización nivel maestro'}
                                </p>
                            </div>
                            <Button disabled={isPreview} className="rounded-2xl px-10 h-12 bg-zinc-950 hover:bg-zinc-800 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl transition-all active:scale-95">
                                <Save className="w-4 h-4 mr-2" />
                                Aplicar Cambios Maestros
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Commercial Summary */}
                <Card className="rounded-[3rem] border-border shadow-xl overflow-hidden bg-card">
                    <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border p-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <CardTitle className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Oferta Activa</CardTitle>
                                <CardDescription className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">Configuración comercial vigente.</CardDescription>
                            </div>
                            <Link href="/admin/plans">
                                <Button variant="outline" size="sm" className="rounded-2xl border-blue-500/20 text-blue-600 hover:bg-blue-50 font-black uppercase text-[9px] tracking-[0.2em] h-10 px-6 transition-all hover:border-blue-500 shadow-sm">
                                    <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                    Gestionar Catálogo
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10">
                        <div className="space-y-4">
                            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                                {plans.map((plan) => (
                                    <div key={plan.id} className="p-8 border border-border rounded-[2.5rem] bg-slate-50/30 dark:bg-zinc-800/20 shadow-inner group hover:border-blue-500/30 transition-all hover:shadow-lg">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="font-black text-xs uppercase tracking-[0.1em] text-slate-900 dark:text-white italic">{plan.name}</span>
                                            <Badge variant="outline" className="text-[8px] border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-lg uppercase font-black text-slate-400 tracking-tighter">
                                                {plan.id}
                                            </Badge>
                                        </div>
                                        <div className="text-3xl font-black text-blue-600 tracking-tighter italic">
                                            ${plan.price.toLocaleString()}
                                            <span className="text-[10px] font-bold text-slate-400 ml-2 uppercase tracking-widest not-italic">/ {plan.interval === 'month' ? 'mes' : 'año'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {plans.length === 0 && !errorState && (
                                <div className="p-20 text-center border-2 border-dashed border-border rounded-[2.5rem]">
                                    <AlertTriangle className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic opacity-60">Sin planes detectados</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
