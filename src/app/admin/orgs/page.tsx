import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Building2, Users, FolderKanban, CheckCircle2 } from "lucide-react";
import { OrgAdminRow } from "@/components/admin/OrgAdminRow";

export default async function AdminOrgsPage() {
    const supabase = await createClient();

    // Fetch all organizations with some details
    const { data: orgs } = await supabase
        .from("Organization")
        .select(`
            *,
            members:OrganizationMember(count),
            projects:Project(count),
            clients:Client(count)
        `)
        .order("createdAt", { ascending: false });

    const { data: plans } = await supabase
        .from('Plan')
        .select('id, name')
        .eq('isActive', true)
        .order('price', { ascending: true });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Organizaciones</h1>
                    <p className="text-slate-500 text-sm">Gestiona y habilita empresas en el sistema.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Empresa / RUT</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Estado</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Plan Actual</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Métricas</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Control</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {orgs?.map((org: any) => (
                            <OrgAdminRow key={org.id} org={org} availablePlans={plans || []} />
                        ))}
                    </tbody>
                </table>
                {(!orgs || orgs.length === 0) && (
                    <div className="p-12 text-center text-slate-400 italic">
                        No hay organizaciones registradas.
                    </div>
                )}
            </div>
        </div>
    );
}
