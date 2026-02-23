import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Building2, AlertTriangle, Search } from "lucide-react";
import { OrgAdminRow } from "@/components/admin/OrgAdminRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminOrgsPage() {
    console.log("[ADMIN_ORGS] Loading start");
    
    let orgs: any[] = [];
    let plans: { id: string; name: string }[] = [];
    let isDegraded = false;
    let errorMsg = null;

    try {
        const isAdminConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = isAdminConfigured ? createAdminClient() : await createClient();
        
        if (!isAdminConfigured) {
            console.warn("[ADMIN_ORGS] Service role missing, using standard client");
            isDegraded = true;
        }

        const [orgsRes, plansRes] = await Promise.all([
            supabase
                .from("Organization")
                .select(`
                    *,
                    subscription:Subscription(*),
                    members:OrganizationMember(count),
                    projects:Project(count),
                    clients:Client(count)
                `)
                .order("createdAt", { ascending: false }),
            supabase
                .from('Plan')
                .select('id, name')
                .eq('isActive', true)
                .order('price', { ascending: true })
        ]);

        if (orgsRes.error) throw orgsRes.error;
        
        orgs = orgsRes.data || [];
        plans = plansRes.data || [];

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[ADMIN_ORGS] Fetch failed:", message);
        errorMsg = message;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {isDegraded && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Modo Seguro: El listado de organizaciones puede estar limitado por las políticas RLS actuales.</span>
                </div>
            )}

            {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-700 text-xs font-bold shadow-sm">
                    Error en Sincronización Global: {errorMsg}
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tight text-slate-900 dark:text-white uppercase">Directorio Maestro</h1>
                    <p className="text-slate-500 font-medium">Control total de organizaciones y ecosistemas TechWise.</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 px-6 py-3 rounded-2xl border border-border shadow-sm flex items-center gap-6">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Total Ecosistemas</span>
                        <div className="text-2xl font-black text-blue-600">{orgs.length}</div>
                    </div>
                    <div className="w-px h-8 bg-border hidden md:block" />
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Planes Activos</span>
                        <div className="text-2xl font-black text-indigo-600">{plans.length}</div>
                    </div>
                </div>
            </div>

            <Card className="rounded-[2.5rem] border-border shadow-2xl overflow-hidden bg-card">
                <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-500" />
                            Control de Organizaciones
                        </CardTitle>
                        {/* Future search/filter bar */}
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Filtrar organizaciones..." 
                                className="pl-9 pr-4 py-2 bg-white dark:bg-zinc-800 border border-border rounded-full text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all w-full md:w-64 shadow-inner"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table data-testid="cockpit-orgs-table" className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/30 dark:bg-zinc-900/30 border-b border-border">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Organización / ID</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado Vital</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Configuración Plan</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Métricas</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {orgs.map((org) => (
                                    <OrgAdminRow key={org.id} org={org} availablePlans={plans} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {orgs.length === 0 && !errorMsg && (
                        <div className="p-24 text-center">
                            <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold italic">No se han detectado organizaciones en el sistema.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
