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
import { AdminMasterService } from "@/lib/admin/admin-master-service";

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
    const traceId = `SET-PAGE-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    let systemSettings: any = null;
    let errorState: { message: string; code: string; traceId: string } | null = null;
    
    const isPreview = process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development';

    try {
        systemSettings = await AdminMasterService.getSystemSettings();
    } catch (err: unknown) {
        const normalized = normalizeOperationalError(err);
        console.error(`[ADMIN_SETTINGS][${traceId}][${normalized.code}] ${normalized.message}`);
        errorState = { message: normalized.message, code: normalized.code, traceId };
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20">
            
            {errorState && (
                <div className="bg-rose-50 border border-rose-200 p-6 rounded-[2rem] flex items-start gap-4 shadow-sm animate-in zoom-in duration-300">
                    <div className="bg-rose-100 p-2 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                        <h3 className="text-rose-900 font-black uppercase text-[10px] tracking-widest mb-1">Fallo de Configuración</h3>
                        <p className="text-rose-700 text-xs font-medium leading-relaxed">{errorState.message}</p>
                        <p className="text-rose-400 text-[9px] font-mono mt-1 uppercase">Direct DB Mode | Code: {errorState.code} | Trace: {errorState.traceId}</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tight text-slate-800 dark:text-white uppercase tracking-tight">Parámetros Globales</h2>
                    <p className="text-slate-500 font-medium text-sm italic">Gobernanza del ecosistema TechWise (Direct DB)</p>
                </div>
            </div>

            <form 
                action={async (formData) => {
                    "use server";
                    await persistGlobalSettings(formData);
                }} 
                className="grid gap-10"
            >
                <Card className="rounded-[3rem] border-border shadow-2xl overflow-hidden bg-card transition-all hover:shadow-blue-500/5">
                    <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border p-10">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.4em] flex items-center gap-4 text-slate-500">
                            <ShieldCheck className="w-6 h-6 text-blue-500" />
                            Control de Plataforma
                        </CardTitle>
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
                            <div className="flex items-center gap-3 px-4 py-2 rounded-xl border bg-emerald-50 border-emerald-100">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Motor Direct DB Activo</p>
                            </div>
                            <Button type="submit" disabled={isPreview} className="rounded-2xl px-10 h-12 bg-zinc-950 hover:bg-zinc-800 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-50">
                                <Save className="w-4 h-4 mr-2" />
                                Persistir Cambios
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
