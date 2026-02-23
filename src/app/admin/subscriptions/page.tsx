import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUBSCRIPTION_PLANS, PLAN_LABELS, PlanTier, PlanFeatures } from "@/config/subscription-plans";
import { CreditCard, Users, TrendingUp, AlertTriangle, Building2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { normalizeOperationalError } from "@/lib/superadmin/error-normalizer";

export default async function AdminSubscriptionsPage() {
    const traceId = `SUB-PAGE-${Math.random().toString(36).substring(7).toUpperCase()}`;
    console.log(`[ADMIN_SUBS][${traceId}] Loading start v4.3.0`);
    
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
    let errorState: { message: string; code: string; traceId: string } | null = null;

    try {
        const isAdminConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = isAdminConfigured ? createAdminClient() : await createClient();

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

        const mrrEstimate: Record<string, number> = { FREE: 0, PRO: 29, ENTERPRISE: 99 };

        const rawOrgs = (orgs as { 
            id: string; 
            name: string; 
            plan: string | null; 
            settings: unknown; 
            members: { count: number }[]; 
            projects: { count: number }[] 
        }[]) || [];
        
        orgsWithUsage = rawOrgs.map((org) => {
            if (!org) return null;
            const plan: PlanTier = (org.plan as PlanTier) || (org.settings as Record<string, unknown>)?.plan as PlanTier || 'FREE';

            if (planCounts[plan] !== undefined) planCounts[plan]++;
            totalMRR += mrrEstimate[plan] || 0;

            const limits = SUBSCRIPTION_PLANS[plan] || SUBSCRIPTION_PLANS['FREE'];
            const userCount = org.members?.[0]?.count || 0;
            const projectCount = org.projects?.[0]?.count || 0;

            const isNearLimit = (userCount >= (limits?.maxUsers || 1) * 0.9) || (projectCount >= (limits?.maxProjects || 1) * 0.9);
            const isOverLimit = (userCount > (limits?.maxUsers || 0)) || (projectCount > (limits?.maxProjects || 0));

            return {
                id: org.id || 'unknown',
                name: org.name || 'Sin nombre',
                currentPlan: plan,
                userCount,
                projectCount,
                limits: limits || SUBSCRIPTION_PLANS['FREE'],
                isNearLimit,
                isOverLimit
            };
        }).filter((o): o is NonNullable<typeof o> => o !== null);

        orgsWithUsage.sort((a, b) => (b.isOverLimit ? 1 : 0) - (a.isOverLimit ? 1 : 0));

    } catch (err: unknown) {
        const normalized = normalizeOperationalError(err);
        console.error(`[ADMIN_SUBS][${traceId}][${normalized.code}] ${normalized.message}`);
        errorState = { message: normalized.message, code: normalized.code, traceId };
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            
            {/* Error State Hardening (Anti-[object Object]) */}
            {errorState && (
                <div className="bg-rose-50 border border-rose-200 p-6 rounded-[2rem] flex items-start gap-4 shadow-sm animate-in zoom-in duration-300">
                    <div className="bg-rose-100 p-2 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                        <h3 className="text-rose-900 font-black uppercase text-[10px] tracking-widest mb-1">Error de Cálculo</h3>
                        <p className="text-rose-700 text-xs font-medium leading-relaxed">{errorState.message}</p>
                        <p className="text-rose-400 text-[9px] font-mono mt-1 uppercase">Block: Usage_Engine | Code: {errorState.code} | Trace: {errorState.traceId} | v4.3.0</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tight text-slate-900 dark:text-white uppercase">Suscripciones & Uso</h1>
                    <p className="text-slate-500 font-medium text-sm italic">Análisis de consumo y rentabilidad v4.3.0</p>
                </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="rounded-[2rem] shadow-xl border-emerald-100 dark:border-emerald-900/20 bg-emerald-50/30 dark:bg-emerald-900/10 overflow-hidden group">
                    <CardContent className="p-8">
                        <div className="flex items-center gap-5">
                            <div className="p-4 rounded-2xl bg-emerald-100 text-emerald-600 shadow-inner group-hover:scale-110 transition-transform"><CreditCard className="w-6 h-6" /></div>
                            <div>
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">MRR Estimado</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">${totalMRR.toLocaleString()}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                {Object.entries(planCounts).map(([plan, count]) => (
                    <Card key={plan} className="rounded-[2rem] shadow-sm border-border">
                        <CardContent className="p-8">
                            <div className="flex items-center gap-5">
                                <div className={cn(
                                    "p-4 rounded-2xl shadow-inner",
                                    plan === 'PRO' ? 'bg-blue-50 text-blue-600' : plan === 'ENTERPRISE' ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-400'
                                )}>
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{PLAN_LABELS[plan as PlanTier]}</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{count}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="rounded-[3rem] border-border shadow-2xl overflow-hidden bg-card transition-all hover:shadow-blue-500/5">
                <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border p-8">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 text-slate-500">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Monitoreo de Quotas por Nodo
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table data-testid="cockpit-subscriptions-table" className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/30 dark:bg-zinc-900/30 border-b border-border">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organización</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Usuarios</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Proyectos</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {orgsWithUsage.map((org) => (
                                    <tr key={org.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{org.name}</div>
                                            <div className="text-[9px] font-mono text-muted-foreground uppercase opacity-60">{org.id.substring(0,12)}...</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <Badge variant="outline" className={cn(
                                                "rounded-lg uppercase text-[9px] font-black tracking-widest px-2 shadow-sm border-2",
                                                org.currentPlan === 'PRO' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                org.currentPlan === 'ENTERPRISE' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                'bg-slate-50 text-slate-500 border-slate-200'
                                            )}>
                                                {org.currentPlan}
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className={cn("text-[11px] font-mono font-bold", org.userCount >= org.limits.maxUsers ? 'text-rose-600' : 'text-slate-600 dark:text-slate-400')}>
                                                    {org.userCount} / {org.limits.maxUsers}
                                                </span>
                                                <div className="w-28 h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner border border-border">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all duration-700", org.userCount >= org.limits.maxUsers ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-blue-500')}
                                                        style={{ width: `${Math.min((org.userCount / org.limits.maxUsers) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className={cn("text-[11px] font-mono font-bold", org.projectCount >= org.limits.maxProjects ? 'text-rose-600' : 'text-slate-600 dark:text-slate-400')}>
                                                    {org.projectCount} / {org.limits.maxProjects}
                                                </span>
                                                <div className="w-28 h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner border border-border">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all duration-700", org.projectCount >= org.limits.maxProjects ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-emerald-500')}
                                                        style={{ width: `${Math.min((org.projectCount / org.limits.maxProjects) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {org.isOverLimit ? (
                                                <Badge className="rounded-lg bg-rose-100 text-rose-700 border-rose-200 uppercase text-[9px] font-black tracking-widest gap-1 shadow-sm">
                                                    <AlertTriangle className="w-2.5 h-2.5" /> Over-Limit
                                                </Badge>
                                            ) : org.isNearLimit ? (
                                                <Badge className="rounded-lg bg-amber-100 text-amber-700 border-amber-200 uppercase text-[9px] font-black tracking-widest gap-1 shadow-sm">
                                                    <TrendingUp className="w-2.5 h-2.5" /> Warning
                                                </Badge>
                                            ) : (
                                                <span className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.2em] italic">Healthy</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <Link href={`/admin/orgs/${org.id}`}>
                                                <Button variant="outline" size="sm" className="rounded-xl border-blue-500/20 text-blue-600 hover:bg-blue-50 font-black uppercase text-[9px] tracking-[0.2em] h-9 px-4">
                                                    Manage
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {orgsWithUsage.length === 0 && !errorState && (
                        <div className="p-32 text-center">
                            <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest italic opacity-60">Sin registros de consumo activos</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
