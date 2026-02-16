import { createClient } from "@/lib/supabase/server";
import { Building2, Users, Activity, AlertTriangle } from "lucide-react";

export default async function AdminDashboard() {
    const supabase = await createClient();

    // Fetch Global Stats
    const { count: orgCount } = await supabase.from("Organization").select("*", { count: "exact", head: true });
    const { count: userCount } = await supabase.from("Profile").select("*", { count: "exact", head: true });
    const { count: projectCount } = await supabase.from("Project").select("*", { count: "exact", head: true });

    const stats = [
        { label: "Organizaciones", value: orgCount || 0, icon: <Building2 className="w-6 h-6" />, color: "bg-blue-500" },
        { label: "Usuarios Totales", value: userCount || 0, icon: <Users className="w-6 h-6" />, color: "bg-purple-500" },
        { label: "Proyectos Activos", value: projectCount || 0, icon: <Activity className="w-6 h-6" />, color: "bg-emerald-500" },
        { label: "Alertas Sistema", value: 0, icon: <AlertTriangle className="w-6 h-6" />, color: "bg-amber-500" },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard Global</h1>
                <p className="text-slate-500">Métricas en tiempo real de todo el ecosistema TechWise.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                        <div className={`p-3 rounded-xl text-white ${stat.color}`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Organizations Table (Preview) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 dark:text-white">Últimas Organizaciones Registradas</h3>
                    <button className="text-sm text-blue-600 font-medium hover:underline">Ver todas</button>
                </div>
                <div className="overflow-x-auto">
                    {/* Placeholder for table */}
                    <div className="p-12 text-center text-slate-400 italic">
                        Cargando datos de organizaciones...
                    </div>
                </div>
            </div>
        </div>
    );
}
