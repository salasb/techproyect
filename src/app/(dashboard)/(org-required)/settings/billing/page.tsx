import { getOrganizationId } from "@/lib/current-org";
import { getOrganizationSubscription } from "@/lib/subscriptions";
import { CheckCircle2, Crown, Zap, AlertTriangle, Building2, Users, Database, CreditCard } from "lucide-react";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BillingClient } from "@/components/settings/BillingClient";

export default async function BillingPage() {
    const orgId = await getOrganizationId();
    const { plan, usage, limits } = await getOrganizationSubscription(orgId);

    const subscription = await prisma.subscription.findUnique({
        where: { organizationId: orgId },
        include: { organization: true }
    });

    // Fetch all active plans for upgrade options
    const supabase = await createClient();
    const { data: allPlans } = await supabase
        .from('Plan')
        .select('*')
        .eq('isActive', true)
        .order('price', { ascending: true });

    const percentUsers = Math.min((usage.users / limits.maxUsers) * 100, 100);
    const percentProjects = Math.min((usage.projects / limits.maxProjects) * 100, 100);

    // Find current plan details from DB list or fallback
    const currentPlanDetails = allPlans?.find(p => p.id === plan);

    return (
        <div className="space-y-12 animate-in fade-in pb-10">
            <div className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Facturación y Planes</h1>
                    <p className="text-slate-500 font-medium">Gestiona tu suscripción y consulta tu consumo.</p>
                </div>
                {subscription?.providerCustomerId && (
                    <div className="flex flex-col items-end gap-2">
                        <form action={async () => {
                            'use server';
                            const { createCustomerPortalSession } = await import("@/app/actions/subscription");
                            await createCustomerPortalSession();
                        }}>
                            <Button type="submit" variant="outline" className="gap-2">
                                <CreditCard className="w-4 h-4" />
                                Gestionar en Stripe
                            </Button>
                        </form>

                        {/* Wave 5.3: Save Flow */}
                        {subscription.status === 'ACTIVE' && (
                            <BillingClient variant="CONTINUITY" />
                        )}
                    </div>
                )}
            </div>

            {/* Status & Seats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado</span>
                    <div className="flex items-center gap-2">
                        {subscription?.status === 'ACTIVE' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        {subscription?.status === 'TRIALING' && <Zap className="w-5 h-5 text-blue-500" />}
                        {(subscription?.status === 'PAST_DUE' || subscription?.status === 'PAUSED') && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                        <span className="text-lg font-black text-slate-900 dark:text-white uppercase">{subscription?.status || 'SIN PLAN'}</span>
                    </div>
                    {subscription?.currentPeriodEnd && (
                        <p className="text-xs text-slate-500 mt-2">
                            Próximo cargo: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                        </p>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Asientos (Seats)</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{usage.users}</span>
                        <span className="text-slate-400 font-bold">/</span>
                        <span className="text-lg font-bold text-slate-500">{subscription?.seatLimit || limits.maxUsers || '1'}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Usuarios activos en tu organización.</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Plan</span>
                    <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-amber-500" />
                        <span className="text-lg font-black text-slate-900 dark:text-white uppercase">{plan}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Tu nivel de servicio actual.</p>
                </div>
            </div>

            {/* Current Usage Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Users Usage */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-slate-500" />
                            <h4 className="font-bold text-slate-700 dark:text-slate-200">Usuarios</h4>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${usage.users >= limits.maxUsers ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {usage.users} / {limits.maxUsers || '∞'}
                        </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ease-out rounded-full ${usage.users >= limits.maxUsers ? 'bg-red-500' : 'bg-blue-500'
                                }`}
                            style={{ width: `${percentUsers}%` }}
                        ></div>
                    </div>
                </div>

                {/* Projects Usage */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-slate-500" />
                            <h4 className="font-bold text-slate-700 dark:text-slate-200">Proyectos</h4>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${usage.projects >= limits.maxProjects ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {usage.projects} / {limits.maxProjects || '∞'}
                        </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ease-out rounded-full ${usage.projects >= limits.maxProjects ? 'bg-red-500' : 'bg-emerald-500'
                                }`}
                            style={{ width: `${percentProjects}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Plans List */}
            <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Planes Disponibles</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {allPlans?.map((p) => {
                        const isCurrent = p.id === plan;
                        const pLimits = p.limits as any;
                        const pFeatures = p.features as any;

                        return (
                            <div
                                key={p.id}
                                className={`rounded-3xl border p-8 flex flex-col relative ${isCurrent
                                    ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10 dark:bg-blue-900/10'
                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm hover:shadow-md transition-all'
                                    }`}
                            >
                                {isCurrent && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                                        Plan Actual
                                    </span>
                                )}

                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{p.name}</h3>
                                    <p className="text-sm text-slate-500 mt-1 min-h-[40px]">{p.description}</p>
                                </div>

                                <div className="mb-6">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-slate-900 dark:text-white">
                                            ${p.price.toLocaleString()}
                                        </span>
                                        <span className="text-sm font-medium text-slate-500">/{p.interval === 'month' ? 'mes' : 'año'}</span>
                                    </div>
                                </div>

                                <ul className="space-y-4 mb-8 flex-1">
                                    <li className="flex items-start gap-3 text-sm">
                                        <Users className="w-5 h-5 text-slate-400 shrink-0" />
                                        <span>
                                            <strong className="text-slate-900 dark:text-white">{pLimits.maxUsers || 'Ilimitados'}</strong> usuarios
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3 text-sm">
                                        <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
                                        <span>
                                            <strong className="text-slate-900 dark:text-white">{pLimits.maxProjects || 'Ilimitados'}</strong> proyectos
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3 text-sm">
                                        <Database className="w-5 h-5 text-slate-400 shrink-0" />
                                        <span>
                                            <strong className="text-slate-900 dark:text-white">{pLimits.maxStorageGB} GB</strong> almacenamiento
                                        </span>
                                    </li>
                                    {pFeatures?.canAccessAPI && (
                                        <li className="flex items-center gap-3 text-sm">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                            <span>Acceso a API</span>
                                        </li>
                                    )}
                                    {pFeatures?.customDomain && (
                                        <li className="flex items-center gap-3 text-sm">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                            <span>Dominio Personalizado</span>
                                        </li>
                                    )}
                                    {pFeatures?.supportLevel === 'PRIORITY' && (
                                        <li className="flex items-center gap-3 text-sm">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                            <span>Soporte Prioritario</span>
                                        </li>
                                    )}
                                </ul>

                                <div className="mt-auto">
                                    {isCurrent ? (
                                        <Button className="w-full" disabled variant="outline">Plan Actual</Button>
                                    ) : (
                                        <form action={async () => {
                                            'use server';
                                            await import("@/app/actions/subscription").then(m => m.requestUpgrade(p.id));
                                        }}>
                                            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-bold" variant="default">
                                                {p.price > (currentPlanDetails?.price || 0) ? 'Mejorar Plan' : 'Cambiar Plan'}
                                            </Button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

