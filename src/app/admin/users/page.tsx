import { Users, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table";
import { UserAdminRow } from "@/components/admin/UserAdminRow";
import { normalizeOperationalError } from "@/lib/superadmin/error-normalizer";
import { AdminMasterService } from "@/lib/admin/admin-master-service";

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
    const traceId = `USR-PAGE-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    let profiles: any[] = [];
    let count = 0;
    let errorState: { message: string; code: string; traceId: string } | null = null;

    try {
        profiles = await AdminMasterService.getGlobalUsers();
        count = profiles.length;
    } catch (err: unknown) {
        const normalized = normalizeOperationalError(err);
        console.error(`[ADMIN_USERS][${traceId}][${normalized.code}] ${normalized.message}`);
        errorState = { message: normalized.message, code: normalized.code, traceId };
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            
            {errorState && (
                <div className="bg-rose-50 border border-rose-200 p-6 rounded-[2rem] flex items-start gap-4 shadow-sm animate-in zoom-in duration-300">
                    <div className="bg-rose-100 p-2 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                        <h3 className="text-rose-900 font-black uppercase text-[10px] tracking-widest mb-1">Fallo de Sincronización</h3>
                        <p className="text-rose-700 text-xs font-medium leading-relaxed">{errorState.message}</p>
                        <p className="text-rose-400 text-[9px] font-mono mt-1 uppercase">Direct DB Mode | Code: {errorState.code} | Trace: {errorState.traceId}</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tight text-slate-800 dark:text-white uppercase tracking-tight">Cuentas Globales</h2>
                    <p className="text-slate-500 font-medium text-sm italic">Directorio maestro de identidades (Direct DB)</p>
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
                        Explorador de Usuarios
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table data-testid="cockpit-users-table">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b border-border">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Identidad</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Empresa Actual</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Plan</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Rol</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Alta</th>
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
                            <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest italic opacity-60">No se han detectado perfiles</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
