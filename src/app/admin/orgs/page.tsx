import { createAdminClient } from "@/lib/supabase/admin";
import { Building2, AlertTriangle, Search, ShieldCheck } from "lucide-react";
import { OrgAdminRow } from "@/components/admin/OrgAdminRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeOperationalError } from "@/lib/superadmin/error-normalizer";
import { CockpitService, OrgCockpitSummary } from "@/lib/superadmin/cockpit-service";

export default async function AdminOrgsPage() {
    const traceId = "ORG-PAGE-V450";
    console.log(`[ADMIN_ORGS][${traceId}] Loading start v4.5.0`);
    
    let orgs: OrgCockpitSummary[] = [];
    let plans: { id: string; name: string }[] = [];
    let isDegraded = false;
    let errorState: { message: string; code: string; traceId: string } | null = null;

    try {
        const isAdminConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!isAdminConfigured) {
            isDegraded = true;
        }

        const [orgsRes, plansRes] = await Promise.all([
            CockpitService.getOrganizationsList(),
            createAdminClient()
                .from('Plan')
                .select('id, name')
                .eq('isActive', true)
                .order('price', { ascending: true })
        ]);

        orgs = (orgsRes as unknown as OrgCockpitSummary[]) || [];
        plans = (plansRes.data as { id: string; name: string }[]) || [];

    } catch (err: unknown) {
        const normalized = normalizeOperationalError(err);
        console.error(`[ADMIN_ORGS][${traceId}][${normalized.code}] ${normalized.message}`);
        errorState = { message: normalized.message, code: normalized.code, traceId };
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            
            {/* Hardening: Error State (Anti-[object Object]) */}
            {errorState && (
                <div className="bg-rose-50 border border-rose-200 p-6 rounded-[2rem] flex items-start gap-4 shadow-sm animate-in zoom-in duration-300">
                    <div className="bg-rose-100 p-2 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                        <h3 className="text-rose-900 font-black uppercase text-[10px] tracking-widest mb-1">Fallo de Sincronización</h3>
                        <p className="text-rose-700 text-xs font-medium leading-relaxed">{errorState.message}</p>
                        <p className="text-rose-400 text-[9px] font-mono mt-1 uppercase">Block: Orgs_Master | Code: {errorState.code} | Trace: {errorState.traceId} | v4.4.0</p>
                    </div>
                </div>
            )}

            {/* Hardening: Degraded Config Warning */}
            {isDegraded && !errorState && (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex items-start gap-4 shadow-sm">
                    <div className="bg-amber-100 p-2 rounded-xl">
                        <ShieldCheck className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-amber-900 font-black uppercase text-[10px] tracking-widest mb-1">Aislamiento Activo (Safe Mode)</h3>
                        <p className="text-amber-700 text-xs font-medium leading-relaxed">Operando bajo RLS restringido por falta de credenciales maestras.</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tight text-slate-900 dark:text-white uppercase">Directorio Maestro</h1>
                    <p className="text-slate-500 font-medium text-sm italic">Gobernanza de Ecosistemas v4.5.0</p>
                </div>
                <div className="bg-white dark:bg-zinc-950 px-6 py-3 rounded-2xl border border-border shadow-sm flex items-center gap-8">
                    <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Nodos Detectados</span>
                        <div className="text-2xl font-black text-blue-600 tracking-tighter">{orgs.length}</div>
                    </div>
                    <div className="w-px h-10 bg-border hidden md:block" />
                    <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Catálogo Activo</span>
                        <div className="text-2xl font-black text-indigo-600 tracking-tighter">{plans.length}</div>
                    </div>
                </div>
            </div>

            <Card className="rounded-[2.5rem] border-border shadow-2xl overflow-hidden bg-card transition-all hover:shadow-blue-500/5">
                <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 text-slate-500">
                            <Building2 className="w-5 h-5 text-blue-500" />
                            Control de Organizaciones
                        </CardTitle>
                        <div className="relative group max-w-sm w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Filtrar ecosistemas..." 
                                className="pl-11 pr-6 py-2.5 bg-white dark:bg-zinc-800 border border-border rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-blue-500/10 outline-none transition-all w-full shadow-inner"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table data-testid="cockpit-orgs-table" className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/30 dark:bg-zinc-900/30 border-b border-border">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa / Master ID</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Salud Operacional</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan & Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Métricas</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gobernanza</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {orgs.map((org) => (
                                    <OrgAdminRow key={org.id} org={org} availablePlans={plans} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {orgs.length === 0 && !errorState && (
                        <div className="p-32 text-center">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-zinc-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-border">
                                <Building2 className="w-10 h-10 text-slate-200" />
                            </div>
                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest italic opacity-60">No se detectan organizaciones activas</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
