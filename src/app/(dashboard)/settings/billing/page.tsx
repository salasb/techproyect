import { getOrganizationId } from "@/lib/current-org";
import { getOrganizationSubscription } from "@/lib/subscriptions";
import { PLAN_LABELS } from "@/config/subscription-plans";
import { CheckCircle2, Crown, Zap, AlertTriangle } from "lucide-react";

export default async function BillingPage() {
    const orgId = await getOrganizationId();
    const { plan, usage, limits } = await getOrganizationSubscription(orgId);

    const percentUsers = Math.min((usage.users / limits.maxUsers) * 100, 100);
    const percentProjects = Math.min((usage.projects / limits.maxProjects) * 100, 100);

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Facturación y Planes</h1>
                    <p className="text-slate-500 font-medium">Gestiona tu suscripción y consulta tu consumo.</p>
                </div>
            </div>

            {/* Current Plan Card */}
            <div className={`p-8 rounded-3xl border shadow-lg relative overflow-hidden ${plan === 'PRO' ? 'bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-500 text-white' :
                plan === 'ENTERPRISE' ? 'bg-gradient-to-br from-purple-800 to-slate-900 border-purple-500 text-white' :
                    'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                {plan !== 'FREE' && (
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <Crown className="w-64 h-64 -mr-10 -mt-10" />
                    </div>
                )}

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-md ${plan === 'FREE' ? 'bg-slate-100 text-slate-600' : 'bg-white/20 text-white'
                                }`}>
                                Plan Actual
                            </span>
                        </div>
                        <h2 className={`text-4xl font-black mb-2 ${plan === 'FREE' ? 'text-slate-900 dark:text-white' : 'text-white'}`}>
                            {PLAN_LABELS[plan]}
                        </h2>
                        <p className={`text-sm font-medium opacity-80 max-w-md ${plan === 'FREE' ? 'text-slate-500' : 'text-blue-100'}`}>
                            {plan === 'FREE' ? 'Ideal para comenzar. Límites básicos para uso personal.' :
                                plan === 'PRO' ? 'Potencia para equipos en crecimiento. Proyectos ilimitados.' :
                                    'Solución completa para grandes organizaciones.'}
                        </p>
                    </div>

                    {plan === 'FREE' ? (
                        <form action={async () => {
                            'use server';
                            await import("@/app/actions/subscription").then(m => m.requestUpgrade('PRO'));
                        }}>
                            <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Solicitar Plan Pro
                            </button>
                        </form>
                    ) : (
                        <div className="flex flex-col items-end">
                            <div className="text-right">
                                <span className="text-3xl font-bold">$XX</span>
                                <span className="text-sm opacity-70"> / mes</span>
                            </div>
                            <span className="text-xs opacity-60">Próxima facturación: --/--/----</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Usage Stats */}
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-8">Consumo del Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Users Usage */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-700 dark:text-slate-200">Usuarios</h4>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${usage.users >= limits.maxUsers ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {usage.users} / {limits.maxUsers}
                        </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ease-out rounded-full ${usage.users >= limits.maxUsers ? 'bg-red-500' : 'bg-blue-500'
                                }`}
                            style={{ width: `${percentUsers}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-3">
                        {usage.users >= limits.maxUsers && plan === 'FREE'
                            ? "Has alcanzado el límite de usuarios. Actualiza para invitar más miembros."
                            : "Usuarios activos en tu organización."}
                    </p>
                </div>

                {/* Projects Usage */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-700 dark:text-slate-200">Proyectos</h4>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${usage.projects >= limits.maxProjects ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {usage.projects} / {limits.maxProjects}
                        </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ease-out rounded-full ${usage.projects >= limits.maxProjects ? 'bg-red-500' : 'bg-emerald-500'
                                }`}
                            style={{ width: `${percentProjects}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-3">
                        {usage.projects >= limits.maxProjects && plan === 'FREE'
                            ? "Has alcanzado el límite de proyectos. Actualiza a Pro para proyectos ilimitados."
                            : "Proyectos activos actualmente."}
                    </p>
                </div>
            </div>
        </div>
    );
}
