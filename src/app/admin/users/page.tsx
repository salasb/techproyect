import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Users, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAdminRow } from "@/components/admin/UserAdminRow";

export default async function AdminUsersPage() {
    console.log("[ADMIN_USERS] Loading start");
    
    let profiles: { id: string; [key: string]: unknown }[] = [];
    let count = 0;
    let isDegraded = false;
    let errorMsg = null;

    try {
        // Try to use Admin Client for full visibility
        const isAdminConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = isAdminConfigured ? createAdminClient() : await createClient();
        
        if (!isAdminConfigured) {
            console.warn("[ADMIN_USERS] Service role missing, using standard client (RLS active)");
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
        
        profiles = (profilesRes.data as { id: string; [key: string]: unknown }[]) || [];
        count = countRes.count || 0;

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[ADMIN_USERS] Fetch failed:", message);
        errorMsg = message;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {isDegraded && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Modo de visualización limitado: Sin Service Role Key solo puedes ver perfiles permitidos por RLS.</span>
                </div>
            )}

            {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-700 text-xs font-bold">
                    Error crítico al sincronizar usuarios: {errorMsg}
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tight text-slate-800 dark:text-white uppercase">Usuarios Globales</h2>
                    <p className="text-slate-500 font-medium">Directorio maestro de identidades en TechWise.</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 px-6 py-3 rounded-2xl border border-border shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Registrados</span>
                    <div className="text-3xl font-black text-blue-600">{count}</div>
                </div>
            </div>

            <Card className="rounded-[2rem] border-border shadow-xl overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border p-6">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        Explorador de Cuentas
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b border-border">
                                    <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Usuario</TableHead>
                                    <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Organización</TableHead>
                                    <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Plan</TableHead>
                                    <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Rol</TableHead>
                                    <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Registro</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {profiles.map((user) => (
                                    <UserAdminRow key={user.id} user={user} />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    {profiles.length === 0 && !errorMsg && (
                        <div className="p-20 text-center text-slate-400 italic font-medium">
                            No se encontraron perfiles coincidentes.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
