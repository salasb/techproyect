import { Building2, Users, ShieldAlert, Zap, AlertTriangle, CreditCard, Activity } from "lucide-react";
import Link from "next/link";
import { CockpitService } from "@/lib/superadmin/cockpit-service";
import { SaaSHealthTable } from "@/components/admin/SaaSHealthTable";

export default async function AdminDashboard() {
    // 1. Fetch Global Insights & Stats using the new CockpitService
    const [kpis, orgs] = await Promise.all([
        CockpitService.getGlobalKPIs(),
        CockpitService.getOrganizationsList()
    ]);

    // Audit view
    try {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await CockpitService.auditAdminAction(user.id, 'SUPERADMIN_COCKPIT_VIEWED', 'Superadmin viewed global cockpit');
        }
    } catch (e) {
        console.error("Failed to audit cockpit view", e);
    }

    const stats = [
        {
            label: "Organizaciones",
            value: kpis.totalOrgs,
            icon: Building2,
            color: "text-blue-600",
            bg: "bg-blue-50",
            sub: "Empresas registradas"
        },
        {
            label: "En Riesgo / Críticas",
            value: orgs.filter(o => ['WARNING', 'CRITICAL'].includes(o.health.status)).length,
            icon: AlertTriangle,
            color: "text-amber-600",
            bg: "bg-amber-50",
            sub: "Requieren atención"
        },
        {
            label: "Facturación / Issues",
            value: kpis.issuesCount,
            icon: CreditCard,
            color: "text-red-600",
            bg: "bg-red-50",
            sub: "Suscripciones con problemas"
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight bg-gradient-to-r from-blue-700 to-indigo-500 bg-clip-text text-transparent italic">Global Cockpit v1.9</h1>
                    <p className="text-muted-foreground font-medium underline decoration-blue-500/30 underline-offset-4">Monitorización estratégica de todo el ecosistema TechWise.</p>
                </div>
            </div>

            {/* 1. Global KPI Aggregation */}
            <div className="bg-zinc-900 rounded-3xl p-8 text-white overflow-hidden relative shadow-2xl border border-white/5">
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Salud Global</div>
                        <div className="flex items-center gap-3">
                            <Activity className={`w-5 h-5 ${kpis.issuesCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`} />
                            <span className="text-2xl font-black italic">
                                {kpis.issuesCount > 0 ? 'REVISIÓN REQUERIDA' : 'SISTEMA ÓPTIMO'}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Trials Activos</div>
                        <div className="text-2xl font-black text-rose-400">{kpis.activeTrials}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Inactividad (&gt;7d)</div>
                        <div className="text-2xl font-black text-blue-400">{kpis.inactiveOrgs}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Total Orgs</div>
                        <div className="text-2xl font-black text-white">{kpis.totalOrgs}</div>
                    </div>
                </div>
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-[80px] -ml-32 -mb-32" />
            </div>

            {/* 2. Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-3 relative z-10">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:rotate-6`}>
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
                    </div>
                ))}
            </div>

            {/* 3. Organizations Health Detail */}
            <div className="space-y-6">
                <SaaSHealthTable orgs={orgs as any} />
            </div>

            {/* 4. Navigation Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AdminLink href="/admin/orgs" label="Directorio" icon={<Building2 className="w-4 h-4" />} />
                <AdminLink href="/admin/users" label="Usuarios" icon={<Users className="w-4 h-4" />} />
                <AdminLink href="/admin/plans" label="Facturación" icon={<CreditCard className="w-4 h-4" />} />
                <AdminLink href="/admin/settings" label="Sistema" icon={<Zap className="w-4 h-4" />} />
            </div>
        </div>
    );
}

function AdminLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
    return (
        <Link href={href} className="p-4 bg-white dark:bg-zinc-900 border border-border rounded-xl text-center hover:border-blue-500 transition-all group flex items-center justify-center gap-2 shadow-sm">
            <span className="text-zinc-400 group-hover:text-blue-500 transition-colors">{icon}</span>
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-blue-600 transition-colors uppercase tracking-wider">{label}</span>
        </Link>
    );
}

