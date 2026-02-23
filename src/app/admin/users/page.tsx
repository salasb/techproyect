import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Users, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table";
import { UserAdminRow } from "@/components/admin/UserAdminRow";
import { normalizeOperationalError } from "@/lib/superadmin/error-normalizer";

export default async function AdminUsersPage() {
    console.log("[ADMIN_USERS] Loading start v4.2.2");
    
    let profiles: { id: string; [key: string]: unknown }[] = [];
    let count = 0;
    let isDegraded = false;
    let errorState: { message: string; code: string } | null = null;

    try {
        const isAdminConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = isAdminConfigured ? createAdminClient() : await createClient();
        
        if (!isAdminConfigured) {
            isDegraded = true;
        }

        const [profilesRes, countRes] = await Promise.all([
            supabase
                .from('Profile')
                .select('*, organization:Organization(name, plan)')
                .order('createdAt', { ascending: false }),
            supabase
                .from('Profile')
                .select('*', { count: 'exact', head: true })
        ]);

        if (profilesRes.error) throw profilesRes.error;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        profiles = (profilesRes.data as any[]) || [];
        count = countRes.count || 0;

    } catch (err: unknown) {
        const normalized = normalizeOperationalError(err);
        errorState = { message: normalized.message, code: normalized.code };
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            
            {/* Error State Hardening */}
            {errorState && (
                <div className="bg-rose-50 border border-rose-200 p-6 rounded-[2rem] flex items-start gap-4 shadow-sm animate-in zoom-in duration-300">
                    <div className="bg-rose-100 p-2 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                        <h3 className="text-rose-900 font-black uppercase text-[10px] tracking-widest mb-1">Fallo de Sincronización</h3>
                        <p className="text-rose-700 text-xs font-medium leading-relaxed">{errorState.message}</p>
                        <p className="text-rose-400 text-[9px] font-mono mt-1 uppercase">Block: Users_Master | Code: {errorState.code}</p>
                    </div>
                </div>
            )}

            {/* Degraded Config Hardening */}
            {isDegraded && !errorState && (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex items-start gap-4 shadow-sm">
                    <div className="bg-amber-100 p-2 rounded-xl">
                        <ShieldCheck className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-amber-900 font-black uppercase text-[10px] tracking-widest mb-1">Visibilidad de Modo Seguro</h3>
                        <p className="text-amber-700 text-xs font-medium leading-relaxed">Sin Admin Key, el motor solo detecta identidades dentro de su contexto inmediato.</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tight text-slate-800 dark:text-white uppercase tracking-tight">Usuarios Globales</h2>
                    <p className="text-slate-500 font-medium text-sm italic">Directorio maestro de identidades v4.2.2</p>
                </div>
                <div className="bg-white dark:bg-zinc-950 px-8 py-4 rounded-[2rem] border border-border shadow-xl">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1.5">Total Identidades</span>
                    <div className="text-4xl font-black text-blue-600 tracking-tighter italic">{count}</div>
                </div>
            </div>

            <Card className="rounded-[3rem] border-border shadow-2xl overflow-hidden bg-card transition-all hover:shadow-blue-500/5">
                <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border p-8">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 text-slate-500">
                        <Users className="w-5 h-5 text-blue-500" />
                        Explorador de Cuentas
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table data-testid="cockpit-users-table">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b border-border">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Usuario / Identidad</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Organización</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Plan Activo</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Rol Maestro</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Registro</th>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {profiles.map((user) => (
                                    <UserAdminRow key={user.id} user={user} />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    {profiles.length === 0 && !errorState && (
                        <div className="p-32 text-center">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-border">
                                <Users className="w-10 h-10 text-slate-200" />
                            </div>
                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest italic">Cero perfiles detectados</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
