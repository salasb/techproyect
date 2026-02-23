import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUBSCRIPTION_PLANS, PLAN_LABELS, PlanTier, PlanFeatures } from "@/config/subscription-plans";
import { Building2, CreditCard, Users, TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminSubscriptionsPage() {
    console.log("[ADMIN_SUBS] Loading start");
    
    let orgsWithUsage: { 
        id: string; 
        name: string; 
        currentPlan: string; 
        userCount: number; 
        projectCount: number; 
        limits: PlanFeatures; 
        isNearLimit: boolean; 
        isOverLimit: boolean;
    }[] = [];
    
    let totalMRR = 0;
    const planCounts: Record<string, number> = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
    let errorMsg = null;

    try {
        const isAdminConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = isAdminConfigured ? createAdminClient() : await createClient();

        // Fetch all organizations to calculate stats
        const { data: orgs, error } = await supabase
            .from("Organization")
            .select(`
                id,
                name,
                plan,
                settings,
                members:OrganizationMember(count),
                projects:Project(count)
            `);

        if (error) throw error;

        // Calculate distributions
        const mrrEstimate: Record<string, number> = { FREE: 0, PRO: 29, ENTERPRISE: 99 }; // Mock pricing

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        orgsWithUsage = (orgs as any[])?.map((org: any) => {
            // Resolve Plan
            const plan: PlanTier = (org.plan as PlanTier) || (org.settings as Record<string, unknown>)?.plan as PlanTier || 'FREE';

            // Update Stats
            if (planCounts[plan] !== undefined) planCounts[plan]++;
            totalMRR += mrrEstimate[plan] || 0;

            const limits = SUBSCRIPTION_PLANS[plan] || SUBSCRIPTION_PLANS['FREE'];
            const userCount = org.members[0]?.count || 0;
            const projectCount = org.projects[0]?.count || 0;

            // Determine Health/Risk
            const isNearLimit = (userCount >= limits.maxUsers * 0.9) || (projectCount >= limits.maxProjects * 0.9);
            const isOverLimit = (userCount > limits.maxUsers) || (projectCount > limits.maxProjects);

            return {
                ...org,
                currentPlan: plan,
                userCount,
                projectCount,
                limits,
                isNearLimit,
                isOverLimit
            };
        }) || [];

        // sort by Over Limit first, then Near Limit
        orgsWithUsage.sort((a, b) => (b.isOverLimit ? 1 : 0) - (a.isOverLimit ? 1 : 0));

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[ADMIN_SUBS] Fetch failed:", message);
        errorMsg = message;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-700 text-xs font-bold shadow-sm">
                    Error al sincronizar métricas de suscripción: {errorMsg}
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tight text-slate-900 dark:text-white uppercase">Suscripciones & MRR</h1>
                    <p className="text-slate-500 font-medium">Gestión de planes, límites y salud financiera por organización.</p>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="rounded-[2rem] shadow-lg border-emerald-100 dark:border-emerald-900/20 bg-emerald-50/30 dark:bg-emerald-900/10 overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-600 shadow-inner"><CreditCard className="w-6 h-6" /></div>
                            <div>
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">MRR Estimado</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">${totalMRR.toLocaleString()}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                {Object.entries(planCounts).map(([plan, count]) => (
                    <Card key={plan} className="rounded-[2rem] shadow-sm border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "p-3 rounded-2xl shadow-inner",
                                    plan === 'PRO' ? 'bg-blue-50 text-blue-600' : plan === 'ENTERPRISE' ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-400'
                                )}>
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{PLAN_LABELS[plan as PlanTier]}</p>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{count}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Table */}
            <Card className="rounded-[2.5rem] border-border shadow-xl overflow-hidden bg-card">
                <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border p-6 px-8">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Monitoreo de Consumo por Tenant
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table data-testid="cockpit-subscriptions-table" className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/30 dark:bg-zinc-900/30 border-b border-border">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Organización</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Plan Actual</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Uso de Usuarios</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Uso de Proyectos</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Estado</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {orgsWithUsage.map((org) => (
                                    <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-slate-900 dark:text-white">{org.name}</div>
                                            <div className="text-[10px] font-mono text-muted-foreground uppercase">{org.id.substring(0,8)}...</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <Badge variant="outline" className={cn(
                                                "rounded-lg uppercase text-[9px] font-black tracking-widest px-2",
                                                org.currentPlan === 'PRO' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                org.currentPlan === 'ENTERPRISE' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                'bg-slate-50 text-slate-500 border-slate-200'
                                            )}>
                                                {org.currentPlan}
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className={cn("text-[11px] font-mono font-bold", org.userCount >= org.limits.maxUsers ? 'text-red-600' : 'text-slate-600 dark:text-slate-400')}>
                                                    {org.userCount} / {org.limits.maxUsers}
                                                </span>
                                                <div className="w-24 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all duration-500", org.userCount >= org.limits.maxUsers ? 'bg-red-500' : 'bg-blue-500')}
                                                        style={{ width: `${Math.min((org.userCount / org.limits.maxUsers) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className={cn("text-[11px] font-mono font-bold", org.projectCount >= org.limits.maxProjects ? 'text-red-600' : 'text-slate-600 dark:text-slate-400')}>
                                                    {org.projectCount} / {org.limits.maxProjects}
                                                </span>
                                                <div className="w-24 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all duration-500", org.projectCount >= org.limits.maxProjects ? 'bg-red-500' : 'bg-emerald-500')}
                                                        style={{ width: `${Math.min((org.projectCount / org.limits.maxProjects) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {org.isOverLimit ? (
                                                <Badge className="rounded-lg bg-red-100 text-red-700 border-red-200 uppercase text-[9px] font-black tracking-widest gap-1">
                                                    <AlertTriangle className="w-2.5 h-2.5" /> Excedido
                                                </Badge>
                                            ) : org.isNearLimit ? (
                                                <Badge className="rounded-lg bg-amber-100 text-amber-700 border-amber-200 uppercase text-[9px] font-black tracking-widest gap-1">
                                                    <TrendingUp className="w-2.5 h-2.5" /> Al Límite
                                                </Badge>
                                            ) : (
                                                <span className="text-emerald-500 font-black text-[10px] uppercase tracking-widest">Óptimo</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <Link href={`/admin/orgs/${org.id}`}>
                                                <Button variant="outline" size="sm" className="rounded-xl border-blue-500/20 text-blue-600 hover:bg-blue-50 font-bold uppercase text-[9px] tracking-widest">
                                                    Detalles
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {orgsWithUsage.length === 0 && !errorMsg && (
                        <div className="p-24 text-center">
                            <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold italic">No se han detectado organizaciones activas.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
