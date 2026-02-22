import { CockpitService } from "@/lib/superadmin/cockpit-service";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Building2,
    Calendar,
    CreditCard,
    Users,
    History,
    ExternalLink,
    ShieldCheck,
    AlertCircle,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { enterOrganizationContext } from "@/app/actions/superadmin";

export default async function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const org = await CockpitService.getOrganizationDetail(id);

    // Audit view
    try {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await CockpitService.auditAdminAction(user.id, 'SUPERADMIN_ORG_DETAIL_VIEWED', `Superadmin viewed details for organization ${id}`, id);
        }
    } catch (e) {
        console.error("Failed to audit org detail view", e);
    }

    const healthConfig = {
        HEALTHY: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", label: "Saludable" },
        WARNING: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50", label: "En Riesgo" },
        CRITICAL: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", label: "Crítico" },
        INCOMPLETE: { icon: ShieldCheck, color: "text-blue-500", bg: "bg-blue-50", label: "Configurando" },
    };

    // Note: status from cockpit service logic (approximation)
    const healthStatus = org.stats?.lastActivityAt ? 'HEALTHY' : 'WARNING';
    const config = healthConfig[healthStatus as keyof typeof healthConfig];

    return (
        <div className="space-y-8 pb-10">
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        <Link href="/admin" className="hover:text-primary transition-colors">Cockpit</Link>
                        <span>/</span>
                        <span className="text-foreground">Organización</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-black shadow-inner">
                            {org.name[0].toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-foreground tracking-tight">{org.name}</h1>
                            <p className="text-muted-foreground text-sm font-medium">ID: {org.id}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <form action={async () => {
                        'use server'
                        await enterOrganizationContext(org.id)
                    }}>
                        <button className="bg-zinc-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" /> Entrar a Contexto
                        </button>
                    </form>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Column: Stats & Users */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Identity Card */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm p-8 flex flex-col md:flex-row gap-8">
                        <div className="flex-1 space-y-4">
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Identificación</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase">RUT</div>
                                    <div className="font-bold text-sm">{org.rut || 'No definido'}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase">Creado</div>
                                    <div className="font-bold text-sm">{format(new Date(org.createdAt), 'dd MMMM yyyy', { locale: es })}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase">Estado</div>
                                    <div className="font-bold text-sm capitalize">{org.status}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase">Plan</div>
                                    <div className="font-bold text-sm text-blue-600">{org.plan || 'Free'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="w-px bg-border hidden md:block" />

                        <div className="flex-1 space-y-4">
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Billing & Stripe</h3>
                            {org.subscription ? (
                                <div className="space-y-2">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${org.subscription.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                        <CreditCard className="w-3.5 h-3.5" />
                                        {org.subscription.status}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Finaliza: {org.subscription.currentPeriodEnd ? format(new Date(org.subscription.currentPeriodEnd), 'dd/MM/yy') : 'N/A'}
                                    </div>
                                    <div className="text-xs text-zinc-500 font-mono">
                                        SubID: {org.subscription.providerSubscriptionId?.substring(0, 12)}...
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground italic bg-zinc-50 p-4 rounded-xl border border-dashed border-zinc-200">
                                    Sin suscripción configurada en base de datos.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Team List */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border bg-zinc-50/50">
                            <h4 className="font-bold text-sm flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" /> Miembros de la Organización
                            </h4>
                        </div>
                        <div className="divide-y divide-border">
                            {org.OrganizationMember.map((m: any) => (
                                <div key={m.id} className="p-4 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500">
                                            {m.profile.name?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-foreground">{m.profile.name}</div>
                                            <div className="text-[10px] text-muted-foreground">{m.profile.email}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${m.role === 'OWNER' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                                            {m.role}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Column: Activity & Health */}
                <div className="space-y-8">
                    {/* Health Widget */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Estado Sentinel</h4>
                        <div className={`p-4 rounded-xl ${config.bg} border border-black/5`}>
                            <div className="flex items-center gap-3 mb-2">
                                <config.icon className={`w-5 h-5 ${config.color}`} />
                                <span className={`text-lg font-black italic tracking-tight ${config.color}`}>{config.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {org.stats?.lastActivityAt
                                    ? `Última actividad detectada el ${format(new Date(org.stats.lastActivityAt), 'dd/MM HH:mm')} hrs.`
                                    : 'Sin actividad reciente detectada por el motor de análisis.'}
                            </p>
                        </div>
                    </div>

                    {/* Audit Logs */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border bg-zinc-50/50">
                            <h4 className="font-bold text-xs flex items-center gap-2 uppercase tracking-widest">
                                <History className="w-4 h-4 text-zinc-400" /> Auditoría Reciente
                            </h4>
                        </div>
                        <div className="divide-y divide-zinc-50">
                            {org.auditLogs.map((log: any) => (
                                <div key={log.id} className="p-4 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">{log.action}</span>
                                        <span className="text-[9px] text-zinc-400">{format(new Date(log.createdAt), 'HH:mm • dd/MM')}</span>
                                    </div>
                                    <p className="text-xs text-zinc-600 line-clamp-2">{log.details}</p>
                                </div>
                            ))}
                            {org.auditLogs.length === 0 && (
                                <div className="p-8 text-center text-xs text-muted-foreground italic">
                                    No se registran eventos auditables.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
