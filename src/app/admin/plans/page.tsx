import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, CreditCard, AlertTriangle, Users, Zap } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeOperationalError } from "@/lib/superadmin/error-normalizer";

export default async function AdminPlansPage() {
    const traceId = `PLN-PAGE-${Math.random().toString(36).substring(7).toUpperCase()}`;
    console.log(`[ADMIN_PLANS][${traceId}] Loading start v4.3.0`);
    
    let plans: Record<string, unknown>[] = [];
    let errorState: { message: string; code: string; traceId: string } | null = null;

    try {
        const isAdminConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = isAdminConfigured ? createAdminClient() : await createClient();
        
        const { data, error } = await supabase
            .from('Plan')
            .select('*')
            .order('price', { ascending: true });

        if (error) throw error;
        plans = (data as Record<string, unknown>[]) || [];
    } catch (err: unknown) {
        const normalized = normalizeOperationalError(err);
        console.error(`[ADMIN_PLANS][${traceId}][${normalized.code}] ${normalized.message}`);
        errorState = { message: normalized.message, code: normalized.code, traceId };
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            
            {/* Error State Hardening (Anti-[object Object]) */}
            {errorState && (
                <div className="bg-rose-50 border border-rose-200 p-6 rounded-[2rem] flex items-start gap-4 shadow-sm animate-in zoom-in duration-300">
                    <div className="bg-rose-100 p-2 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                        <h3 className="text-rose-900 font-black uppercase text-[10px] tracking-widest mb-1">Fallo de Sincronización</h3>
                        <p className="text-rose-700 text-xs font-medium leading-relaxed">{errorState.message}</p>
                        <p className="text-rose-400 text-[9px] font-mono mt-1 uppercase">Block: Plans_Master | Code: {errorState.code} | Trace: {errorState.traceId} | v4.3.0</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tight text-slate-800 dark:text-white uppercase">Planes de Oferta</h2>
                    <p className="text-slate-500 font-medium text-sm italic">Arquitectura comercial y límites maestros v4.3.0</p>
                </div>
                <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 px-6 font-bold uppercase text-[10px] tracking-widest h-12 transition-all active:scale-95">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Plan Maestro
                </Button>
            </div>

            <Card className="rounded-[2.5rem] border-border shadow-xl overflow-hidden bg-card">
                <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border p-8">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 text-slate-500">
                        <CreditCard className="w-5 h-5 text-blue-500" />
                        Estructura Comercial Ecosistema
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table data-testid="cockpit-plans-table">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b border-border">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Nivel / Identificador</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Tarifa Base</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cuotas / Límites</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Control</th>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plans.map((p) => {
                                    const limits = (p.limits as Record<string, unknown>) || {};
                                    return (
                                        <TableRow key={p.id as string} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                                            <TableCell className="px-8 py-5">
                                                <div className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{p.name as string}</div>
                                                <div className="text-[10px] font-mono text-muted-foreground uppercase opacity-60">{p.id as string}</div>
                                            </TableCell>
                                            <TableCell className="px-8 py-5 font-black text-blue-600 text-lg tracking-tighter">
                                                ${(p.price as number).toLocaleString()} <span className="text-[9px] font-bold text-slate-400 uppercase ml-1 tracking-widest">{p.currency as string} / {p.interval === 'month' ? 'mes' : 'año'}</span>
                                            </TableCell>
                                            <TableCell className="px-8 py-5 text-center">
                                                <div className="inline-flex items-center gap-3 bg-slate-100 dark:bg-zinc-800 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-600 dark:text-slate-400 border border-border shadow-inner uppercase tracking-widest">
                                                    <Users className="w-3 h-3 text-blue-500" /> {(limits.maxUsers as number) || '∞'} 
                                                    <span className="text-slate-300">|</span> 
                                                    <Zap className="w-3 h-3 text-amber-500" /> {(limits.maxProjects as number) || '∞'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-8 py-5 text-center">
                                                {p.isActive ? (
                                                    <Badge variant="outline" className="rounded-lg bg-emerald-50 text-emerald-700 border-emerald-200 uppercase text-[9px] font-black tracking-widest shadow-sm">Activo</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="rounded-lg bg-slate-50 text-slate-400 border-slate-200 uppercase text-[9px] font-black tracking-widest opacity-50">Inactivo</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-8 py-5 text-right">
                                                <Link href={`/admin/plans/${p.id as string}`}>
                                                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-600 transition-all active:scale-90">
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                    {plans.length === 0 && !errorState && (
                        <div className="p-32 text-center">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-border">
                                <CreditCard className="w-10 h-10 text-slate-200" />
                            </div>
                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest italic opacity-60">Sin planes detectados</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
