import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Building2, Users, FolderKanban, CheckCircle2 } from "lucide-react";

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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Organizaciones</h1>
                    <p className="text-slate-500 text-sm">Gestiona y monitorea todas las empresas en el sistema.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Nombre / RUT</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Registrada</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Usuarios</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Proyectos</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Clientes</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {orgs?.map((org: any) => (
                            <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                                            {org.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{org.name}</p>
                                            <p className="text-xs text-slate-400 font-mono">{org.rut || "Sin RUT"}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    {format(new Date(org.createdAt), 'dd MMM yyyy', { locale: es })}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 text-xs font-bold">
                                        <Users className="w-3 h-3" />
                                        {org.members[0].count}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-xs font-bold">
                                        <FolderKanban className="w-3 h-3" />
                                        {org.projects[0].count}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold">
                                        <Building2 className="w-3 h-3" />
                                        {org.clients[0].count}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase p-2">
                                        Gestionar
                                    </button>
                                </td>
                            </tr>
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
