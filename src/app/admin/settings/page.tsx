import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, ExternalLink, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";

export default async function AdminSettingsPage() {
    console.log("[ADMIN_SETTINGS] Loading start");
    
    let plans: { id: string; name: string; price: number; interval: string }[] = [];
    let errorMsg = null;

    try {
        const isAdminConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = isAdminConfigured ? createAdminClient() : await createClient();

        // Fetch active plans for summary
        const { data, error } = await supabase
            .from('Plan')
            .select('*')
            .eq('isActive', true)
            .order('price', { ascending: true });

        if (error) throw error;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        plans = (data as any[]) || [];
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[ADMIN_SETTINGS] Fetch failed:", message);
        errorMsg = message;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-700 text-xs font-bold shadow-sm">
                    Error al sincronizar ajustes globales: {errorMsg}
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tight text-slate-800 dark:text-white uppercase">Ajustes del Sistema</h2>
                    <p className="text-slate-500 font-medium text-sm">Configuración de gobernanza y parámetros maestros de TechWise.</p>
                </div>
            </div>

            <div className="grid gap-8">
                <Card className="rounded-[2.5rem] border-border shadow-xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border p-8">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-blue-500" />
                            Gobernanza Global
                        </CardTitle>
                        <CardDescription className="text-[11px] font-medium text-slate-400">
                            Parámetros críticos que afectan a todos los nodos del ecosistema.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2.5">
                                <Label htmlFor="appName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre de la Plataforma</Label>
                                <Input id="appName" defaultValue="TechWise" className="rounded-xl border-border bg-slate-50/50 dark:bg-zinc-800/50 font-bold" />
                            </div>
                            <div className="grid gap-2.5">
                                <Label htmlFor="supportEmail" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Terminal de Soporte Maestro</Label>
                                <Input id="supportEmail" type="email" defaultValue="support@techwise.com" className="rounded-xl border-border bg-slate-50/50 dark:bg-zinc-800/50 font-bold" />
                            </div>
                        </div>
                        <div className="pt-4 border-t border-border flex items-center justify-between">
                            <p className="text-[10px] text-slate-400 font-bold italic">Configuración bloqueada en entorno Preview</p>
                            <Button disabled variant="secondary" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest">
                                <Save className="w-4 h-4 mr-2" />
                                Aplicar Cambios
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-border shadow-xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border p-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-sm font-black uppercase tracking-widest">Oferta Comercial</CardTitle>
                                <CardDescription className="text-[11px] font-medium text-slate-400">Planes activos para nuevas organizaciones.</CardDescription>
                            </div>
                            <Link href="/admin/plans">
                                <Button variant="outline" size="sm" className="rounded-xl border-blue-500/20 text-blue-600 hover:bg-blue-50 font-bold uppercase text-[9px] tracking-widest h-9">
                                    <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                    Editar Catálogo
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="space-y-4">
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {plans.map((plan) => (
                                    <div key={plan.id} className="p-6 border border-border rounded-2xl bg-slate-50/30 dark:bg-zinc-800/20 shadow-inner group hover:border-blue-500/20 transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="font-black text-xs uppercase tracking-tight text-slate-900 dark:text-white">{plan.name}</span>
                                            <Badge variant="outline" className="text-[8px] border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-1.5 py-0 rounded uppercase font-bold text-slate-400">
                                                {plan.id}
                                            </Badge>
                                        </div>
                                        <div className="text-2xl font-black text-blue-600 tracking-tighter">
                                            ${plan.price.toLocaleString()}
                                            <span className="text-[9px] font-bold text-slate-400 ml-1.5 uppercase">/ {plan.interval === 'month' ? 'mes' : 'año'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {plans.length === 0 && !errorMsg && (
                                <div className="p-12 text-center">
                                    <AlertTriangle className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">No hay planes activos configurados.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
