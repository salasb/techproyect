import { createClient } from "@/lib/supabase/server";
import { Building2, Users, FolderKanban, ShieldAlert, Zap } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function AdminDashboard() {
    const supabase = await createClient();

    // Stats fetching
    const { count: totalOrgs } = await supabase.from("Organization").select("*", { count: 'exact', head: true });
    const { count: pendingOrgs } = await supabase.from("Organization").select("*", { count: 'exact', head: true }).eq('status', 'PENDING');
    const { count: totalUsers } = await supabase.from("Profile").select("*", { count: 'exact', head: true });
    const { count: totalProjects } = await supabase.from("Project").select("*", { count: 'exact', head: true });

    const stats = [
        {
            label: "Total Organizaciones",
            value: totalOrgs || 0,
            icon: Building2,
            color: "text-blue-600",
            bg: "bg-blue-50",
            sub: `${pendingOrgs || 0} pendientes de activación`
        },
        {
            label: "Usuarios Totales",
            value: totalUsers || 0,
            icon: Users,
            color: "text-purple-600",
            bg: "bg-purple-50",
            sub: "En todas las empresas"
        },
        {
            label: "Proyectos Activos",
            value: totalProjects || 0,
            icon: FolderKanban,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            sub: "Globalmente"
        },
    ];

    // Fetch recent orgs for preview
    const { data: recentOrgs } = await supabase
        .from("Organization")
        .select("*, members:OrganizationMember(count)")
        .order("createdAt", { ascending: false })
        .limit(5);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">System Overview</h1>
                    <p className="text-slate-500 font-medium">Panel de control global para Geocom Administrador</p>
                </div>
                <div className="flex gap-2">
                    {pendingOrgs && pendingOrgs > 0 ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl text-sm font-bold animate-bounce">
                            <ShieldAlert className="w-4 h-4" />
                            {pendingOrgs} Solicitudes Pendientes
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <Zap className="w-3.5 h-3.5 text-blue-500" />
                            {stat.sub}
                        </div>
                    </div>
                ))}
            </div>

            {/* Organizations Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-blue-500" />
                            Altas Recientes
                        </h2>
                        <Link href="/admin/orgs" className="text-xs font-bold text-blue-600 hover:underline">Ver todas</Link>
                    </div>
                    <div className="p-0">
                        {recentOrgs && recentOrgs.length > 0 ? (
                            recentOrgs.map((org) => (
                                <div key={org.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b last:border-0 border-slate-50 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${org.status === 'PENDING' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                            {org.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <span className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{org.name}</span>
                                            <span className="text-[10px] text-slate-400 block">{format(new Date(org.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${org.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                                                org.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {org.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-slate-400 text-sm italic">
                                No hay registros recientes.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
