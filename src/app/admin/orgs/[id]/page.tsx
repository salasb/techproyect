import { CockpitService } from "@/lib/superadmin/cockpit-service";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Calendar,
    CreditCard,
    Users,
    History,
    ExternalLink,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
    AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { enterOrganizationContext } from "@/app/actions/superadmin";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default async function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    console.log(`[ADMIN_ORG_DETAIL] Loading org=${id}`);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let org: any = null;
    try {
        org = await CockpitService.getOrganizationDetail(id);
    } catch (err) {
        console.error(`[ADMIN_ORG_DETAIL] Fetch failed for ${id}:`, err);
        return notFound();
    }

    if (!org) return notFound();

    // Audit view
    try {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
            await CockpitService.auditAdminAction(authData.user.id, 'SUPERADMIN_ORG_DETAIL_VIEWED', `v3.2 master view for organization ${id}`, id);
        }
    } catch {
        console.warn("[ADMIN_ORG_DETAIL] Audit log non-blocking failure");
    }

    const healthConfig = {
        HEALTHY: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/10", label: "Saludable" },
        WARNING: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/10", label: "En Riesgo" },
        CRITICAL: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/10", label: "Crítico" },
        INCOMPLETE: { icon: ShieldCheck, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/10", label: "Configurando" },
    };

    const healthStatus = org.stats?.lastActivityAt ? 'HEALTHY' : 'WARNING';
    const config = healthConfig[healthStatus as keyof typeof healthConfig];

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20">
            {/* Header / Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/50 pb-8">
                <div className="space-y-3">
                    <Link href="/admin/orgs" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-blue-600 transition-colors group">
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        Volver al Directorio
                    </Link>
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-950 flex items-center justify-center text-white text-2xl font-black shadow-2xl border border-white/10 italic">
                            {org.name[0].toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">{org.name}</h1>
                            <p className="text-muted-foreground text-xs font-mono uppercase tracking-widest mt-1 opacity-60">Master ID: {org.id}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <form action={async () => {
                        'use server'
                        await enterOrganizationContext(org.id)
                    }}>
                        <Button className="rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white px-8 h-12 font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center gap-3">
                            <ExternalLink className="w-4 h-4" /> Entrar a Contexto
                        </Button>
                    </form>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main Column: Stats & Users */}
                <div className="lg:col-span-2 space-y-10">
                    {/* Identity Card */}
                    <Card className="rounded-[2.5rem] border-border shadow-xl overflow-hidden bg-card">
                        <CardContent className="p-10 flex flex-col md:flex-row gap-12">
                            <div className="flex-1 space-y-6">
                                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] border-b border-border pb-3">Identidad Corporativa</h3>
                                <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                                    <div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">RUT Fiscal</div>
                                        <div className="font-bold text-sm text-foreground">{org.rut || 'No definido'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha Alta</div>
                                        <div className="font-bold text-sm text-foreground">{format(new Date(org.createdAt), 'dd MMMM yyyy', { locale: es })}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Estado Vital</div>
                                        <Badge variant="outline" className="rounded-lg capitalize font-bold text-[10px] bg-slate-50 dark:bg-zinc-800">{org.status}</Badge>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nivel Comercial</div>
                                        <div className="font-black text-sm text-blue-600 uppercase tracking-tighter italic">{org.plan || 'Free'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-px bg-border hidden md:block" />

                            <div className="flex-1 space-y-6">
                                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] border-b border-border pb-3">Suscripción & Stripe</h3>
                                {org.subscription ? (
                                    <div className="space-y-4">
                                        <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm", 
                                            org.subscription.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                                            <CreditCard className="w-3.5 h-3.5" />
                                            {org.subscription.status}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-xs text-foreground font-bold flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                Renovación: {org.subscription.currentPeriodEnd ? format(new Date(org.subscription.currentPeriodEnd), 'dd/MM/yyyy') : 'N/A'}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono bg-slate-50 dark:bg-zinc-900 p-2 rounded-lg border border-border break-all">
                                                StripeID: {org.subscription.providerSubscriptionId}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted-foreground italic bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border-2 border-dashed border-border flex items-center justify-center text-center">
                                        No se registra suscripción activa en pasarela de pagos.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Team List */}
                    <Card className="rounded-[2.5rem] border-border shadow-xl overflow-hidden bg-card">
                        <CardHeader className="p-8 border-b border-border bg-slate-50/50 dark:bg-zinc-900/50">
                            <CardTitle className="font-black text-xs uppercase tracking-[0.3em] flex items-center gap-3">
                                <Users className="w-5 h-5 text-blue-500" /> Capital Humano ({org.OrganizationMember.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {org.OrganizationMember.map((m: any) => (
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    <div key={(m as any).id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-black text-zinc-500 shadow-inner group-hover:scale-110 transition-transform">
                                                {m.profile.name?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-foreground uppercase tracking-tight">{m.profile.name}</div>
                                                <div className="text-[10px] text-muted-foreground font-mono">{m.profile.email}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm", 
                                                m.role === 'OWNER' ? 'bg-zinc-900 text-white border-zinc-800' : 'bg-white dark:bg-zinc-900 text-slate-500 border-border')}>
                                                {m.role}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Column: Activity & Health */}
                <div className="space-y-10">
                    {/* Health Widget */}
                    <Card className="rounded-[2.5rem] border-border shadow-xl p-8 bg-card relative overflow-hidden">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-6 border-b border-border pb-3">Monitoreo Sentinel</h4>
                        <div className={cn("p-6 rounded-3xl border shadow-inner relative z-10", config.bg, "border-black/5")}>
                            <div className="flex items-center gap-4 mb-4">
                                <div className={cn("p-3 rounded-2xl bg-white dark:bg-zinc-950 shadow-sm")}>
                                    <config.icon className={cn("w-6 h-6", config.color)} />
                                </div>
                                <span className={cn("text-xl font-black italic tracking-tighter uppercase", config.color)}>{config.label}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                {org.stats?.lastActivityAt
                                    ? `Última interacción detectada: ${format(new Date(org.stats.lastActivityAt), "dd 'de' MMMM, HH:mm", { locale: es })} hrs.`
                                    : 'Inactividad prolongada. No se detectan señales en el motor de análisis.'}
                            </p>
                        </div>
                        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
                    </Card>

                    {/* Audit Logs */}
                    <Card className="rounded-[2.5rem] border-border shadow-xl overflow-hidden bg-card">
                        <CardHeader className="p-8 border-b border-border bg-slate-50/50 dark:bg-zinc-900/50">
                            <CardTitle className="font-black text-[10px] flex items-center gap-3 uppercase tracking-[0.3em] text-slate-500">
                                <History className="w-4 h-4" /> Línea de Tiempo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {org.auditLogs.map((log: any) => (
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    <div key={(log as any).id} className="p-6 space-y-2 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800">{log.action}</span>
                                            <span className="text-[9px] font-bold text-zinc-400">{format(new Date(log.createdAt), 'HH:mm • dd/MM', { locale: es })}</span>
                                        </div>
                                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug line-clamp-3">{log.details}</p>
                                    </div>
                                ))}
                                {org.auditLogs.length === 0 && (
                                    <div className="p-12 text-center text-[10px] text-muted-foreground font-black uppercase tracking-widest italic opacity-40">
                                        Sin eventos registrados
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
