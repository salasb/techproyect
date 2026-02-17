import { createClient } from "@/lib/supabase/server";
import { Building2, Users, FolderKanban, ShieldAlert, Zap, BarChart3 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { SentinelService } from "@/services/sentinel";
import { AdminService } from "@/services/adminService";
import { SaaSHealthTable } from "@/components/admin/SaaSHealthTable";

export default async function AdminDashboard() {
    // 1. Fetch Global Insights & Stats
    const [globalInsights, globalStats, saasMetrics] = await Promise.all([
        SentinelService.getGlobalSystemHealth(),
        AdminService.getGlobalStats(),
        AdminService.getSaaSMetrics()
    ]);

    const stats = [
        {
            label: "Organizaciones",
            value: globalStats.totalOrganizations,
            icon: Building2,
            color: "text-blue-600",
            bg: "bg-blue-50",
            sub: "Empresas registradas"
        },
        {
            label: "Usuarios",
            value: globalStats.totalUsers,
            icon: Users,
            color: "text-purple-600",
            bg: "bg-purple-50",
            sub: "Globalmente"
        },
        {
            label: "Proyectos",
            value: globalStats.totalProjects,
            icon: FolderKanban,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            sub: "Actividad total"
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight bg-gradient-to-r from-blue-700 to-indigo-500 bg-clip-text text-transparent">SaaS Intelligence</h1>
                    <p className="text-muted-foreground font-medium">Panel de control estratégico para SuperAdministradores TechWise.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="bg-white dark:bg-zinc-800 border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-all flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Reporte Global
                    </button>
                </div>
            </div>

            {/* 1. Global Health Indicator */}
            <div className="bg-zinc-900 rounded-2xl p-6 text-white overflow-hidden relative shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-widest border border-blue-500/30">
                            <ShieldAlert className="w-3 h-3" /> Estado del Ecosistema
                        </div>
                        <h2 className="text-3xl font-bold italic tracking-tight">TechWise está {globalInsights.status === 'optimal' ? 'Óptimo' : 'bajo revisión'}</h2>
                        <p className="text-zinc-400 text-sm max-w-md">El motor Sentinel está monitorizando {globalInsights.checksCount} parámetros críticos en {globalStats.totalOrganizations} organizaciones de forma proactiva.</p>
                    </div>
                    <div className="flex gap-8">
                        <div className="text-center">
                            <div className="text-2xl font-black text-blue-400">{saasMetrics.filter((o: any) => o.health.status === 'HEALTHY').length}</div>
                            <div className="text-[10px] font-bold text-zinc-500 uppercase">Saludables</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-black text-amber-400">{saasMetrics.filter((o: any) => o.health.status === 'WARNING').length}</div>
                            <div className="text-[10px] font-bold text-zinc-500 uppercase">En Riesgo</div>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
            </div>

            {/* 2. Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-3 relative z-10">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                                <h3 className="text-3xl font-black text-foreground">{stat.value}</h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground relative z-10">
                            <Zap className="w-3 h-3 text-blue-500" />
                            {stat.sub}
                        </div>
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-zinc-50 dark:bg-zinc-900/50 rounded-full group-hover:scale-110 transition-transform" />
                    </div>
                ))}
            </div>

            {/* 3. Organizations Health Detail */}
            <div className="space-y-6">
                <SaaSHealthTable orgs={saasMetrics as any} />
            </div>

            {/* 4. Quick Actions & Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/admin/orgs" className="p-4 bg-white dark:bg-zinc-800 border border-border rounded-xl text-center hover:border-primary transition-all group">
                    <span className="text-xs font-bold text-zinc-500 group-hover:text-primary transition-colors">Gestionar Empresas</span>
                </Link>
                <Link href="/admin/users" className="p-4 bg-white dark:bg-zinc-800 border border-border rounded-xl text-center hover:border-primary transition-all group">
                    <span className="text-xs font-bold text-zinc-500 group-hover:text-primary transition-colors">Gestión de Usuarios</span>
                </Link>
                <Link href="/admin/plans" className="p-4 bg-white dark:bg-zinc-800 border border-border rounded-xl text-center hover:border-primary transition-all group">
                    <span className="text-xs font-bold text-zinc-500 group-hover:text-primary transition-colors">Planes y Facturación</span>
                </Link>
                <Link href="/admin/settings" className="p-4 bg-white dark:bg-zinc-800 border border-border rounded-xl text-center hover:border-primary transition-all group">
                    <span className="text-xs font-bold text-zinc-500 group-hover:text-primary transition-colors">Configuración Global</span>
                </Link>
            </div>
        </div>
    );
}
