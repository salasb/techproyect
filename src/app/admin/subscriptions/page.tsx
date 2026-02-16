import { createClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_PLANS, PLAN_LABELS, PlanTier } from "@/config/subscription-plans";
import { Building2, CreditCard, Users, TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function AdminSubscriptionsPage() {
    const supabase = await createClient();

    // Fetch all organizations to calculate stats
    const { data: orgs } = await supabase
        .from("Organization")
        .select(`
            id,
            name,
            plan,
            settings,
            members:OrganizationMember(count),
            projects:Project(count)
        `);

    // Calculate distributions
    const planCounts: Record<string, number> = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
    const mrrEstimate: Record<string, number> = { FREE: 0, PRO: 29, ENTERPRISE: 99 }; // Mock pricing
    let totalMRR = 0;

    const orgsWithUsage = orgs?.map((org: any) => {
        // Resolve Plan
        const plan: PlanTier = (org.plan as PlanTier) || (org.settings as any)?.plan || 'FREE';

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

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Suscripciones</h1>
                    <p className="text-slate-500 font-medium">Gestión de planes y límites de organizaciones.</p>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><CreditCard className="w-6 h-6" /></div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">MRR Estimado</p>
                            <h3 className="text-2xl font-black text-slate-900">${totalMRR.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>
                {Object.entries(planCounts).map(([plan, count]) => (
                    <div key={plan} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${plan === 'PRO' ? 'bg-blue-50 text-blue-600' : plan === 'ENTERPRISE' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">{PLAN_LABELS[plan as PlanTier]}</p>
                                <h3 className="text-2xl font-black text-slate-900">{count}</h3>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                            <th className="px-6 py-4">Organización</th>
                            <th className="px-6 py-4">Plan Actual</th>
                            <th className="px-6 py-4 text-center">Uso de Usuarios</th>
                            <th className="px-6 py-4 text-center">Uso de Proyectos</th>
                            <th className="px-6 py-4 text-center">Estado</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {orgsWithUsage.map((org) => (
                            <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-900">{org.name}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${org.currentPlan === 'PRO' ? 'bg-blue-100 text-blue-700' :
                                            org.currentPlan === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700' :
                                                'bg-slate-100 text-slate-600'
                                        }`}>
                                        {org.currentPlan}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex flex-col items-center">
                                        <span className={`font-mono font-bold ${org.userCount >= org.limits.maxUsers ? 'text-red-600' : 'text-slate-600'}`}>
                                            {org.userCount} / {org.limits.maxUsers}
                                        </span>
                                        <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${org.userCount >= org.limits.maxUsers ? 'bg-red-500' : 'bg-blue-500'}`}
                                                style={{ width: `${Math.min((org.userCount / org.limits.maxUsers) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex flex-col items-center">
                                        <span className={`font-mono font-bold ${org.projectCount >= org.limits.maxProjects ? 'text-red-600' : 'text-slate-600'}`}>
                                            {org.projectCount} / {org.limits.maxProjects}
                                        </span>
                                        <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${org.projectCount >= org.limits.maxProjects ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${Math.min((org.projectCount / org.limits.maxProjects) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {org.isOverLimit ? (
                                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                            <AlertTriangle className="w-3 h-3" /> Excedido
                                        </div>
                                    ) : org.isNearLimit ? (
                                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                                            <TrendingUp className="w-3 h-3" /> Al Límite
                                        </div>
                                    ) : (
                                        <span className="text-emerald-500 font-bold text-xs">OK</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Link href={`/admin/orgs`} className="text-blue-600 hover:underline text-xs font-bold">Administrar</Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
