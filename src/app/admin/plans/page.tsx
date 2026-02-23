import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, CreditCard, AlertTriangle, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPlansPage() {
    console.log("[ADMIN_PLANS] Loading start");
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let plans: any[] = [];
    let errorMsg = null;

    try {
        const isAdminConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = isAdminConfigured ? createAdminClient() : await createClient();
        
        const { data, error } = await supabase
            .from('Plan')
            .select('*')
            .order('price', { ascending: true });

        if (error) throw error;
        plans = data || [];
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[ADMIN_PLANS] Fetch failed:", message);
        errorMsg = message;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-700 text-xs font-bold shadow-sm">
                    Error al sincronizar catálogo de planes: {errorMsg}
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tight text-slate-800 dark:text-white uppercase">Planes de Suscripción</h2>
                    <p className="text-slate-500 font-medium text-sm">Arquitectura comercial y límites de servicio.</p>
                </div>
                <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 px-6 font-bold uppercase text-[10px] tracking-widest h-12">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Plan Maestro
                </Button>
            </div>

            <Card className="rounded-[2.5rem] border-border shadow-xl overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border p-6">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-500" />
                        Catálogo de Oferta
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table data-testid="cockpit-plans-table">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b border-border">
                                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre / Identificador</TableHead>
                                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tarifa Base</TableHead>
                                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Cuotas / Límites</TableHead>
                                    <TableHead className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Estado</TableHead>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Control</th>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plans.map((plan) => {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const limits = (plan.limits as any) || {};
                                    return (
                                        <TableRow key={plan.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                            <TableCell className="px-8 py-5">
                                                <div className="font-bold text-slate-900 dark:text-white">{plan.name}</div>
                                                <div className="text-[10px] font-mono text-muted-foreground uppercase">{plan.id}</div>
                                            </TableCell>
                                            <TableCell className="px-8 py-5 font-black text-blue-600">
                                                ${plan.price.toLocaleString()} <span className="text-[10px] font-bold text-slate-400 uppercase">{plan.currency} / {plan.interval === 'month' ? 'mes' : 'año'}</span>
                                            </TableCell>
                                            <TableCell className="px-8 py-5 text-center">
                                                <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-border">
                                                    <Users className="w-3 h-3" /> {limits.maxUsers || '∞'} 
                                                    <span className="text-slate-300">|</span> 
                                                    <Plus className="w-3 h-3" /> {limits.maxProjects || '∞'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-8 py-5 text-center">
                                                {plan.isActive ? (
                                                    <Badge variant="outline" className="rounded-lg bg-emerald-50 text-emerald-700 border-emerald-200 uppercase text-[9px] font-black tracking-widest">Activo</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="rounded-lg bg-slate-50 text-slate-400 border-slate-200 uppercase text-[9px] font-black tracking-widest">Inactivo</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-8 py-5 text-right">
                                                <Link href={`/admin/plans/${plan.id}`}>
                                                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-600 transition-all">
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
                    {plans.length === 0 && !errorMsg && (
                        <div className="p-20 text-center">
                            <AlertTriangle className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold italic">No se han definido planes comerciales.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
