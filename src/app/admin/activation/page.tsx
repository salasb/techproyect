import React from "react";
import prisma from "@/lib/prisma";
import {
    Users,
    ArrowRight,
    TrendingUp,
    AlertTriangle,
    Zap,
    CreditCard,
    CheckCircle2,
    Calendar
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default async function ActivationDashboard() {
    // 1. Fetch Stats
    const totalOrgs = await prisma.organization.count();

    // Funnel Counts
    const trials = await (prisma as any).activationEvent.count({ where: { eventName: 'TRIAL_STARTED' } });
    const twe = await (prisma as any).activationEvent.count({ where: { eventName: 'TRIAL_WILL_END' } });
    const checkouts = await (prisma as any).activationEvent.count({ where: { eventName: 'CHECKOUT_STARTED' } });
    const paid = await (prisma as any).activationEvent.count({ where: { eventName: 'CHECKOUT_COMPLETED' } });
    const firstValue = await (prisma as any).activationEvent.count({ where: { eventName: 'FIRST_QUOTE_SENT' } });

    const conversionRate = trials > 0 ? (paid / trials) * 100 : 0;

    // 2. Risk Organizations (Trial < 3 days AND No FIRST_QUOTE_SENT)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const riskOrgs = await (prisma.organization as any).findMany({
        where: {
            subscription: {
                status: 'TRIALING',
                trialEndsAt: { lt: threeDaysFromNow }
            },
            NOT: {
                activationEvents: {
                    some: { eventName: 'FIRST_QUOTE_SENT' }
                }
            }
        },
        include: {
            subscription: true,
            _count: {
                select: { projects: true }
            }
        },
        take: 10,
        orderBy: { subscription: { trialEndsAt: 'asc' } }
    });

    const funnelSteps = [
        { label: 'Trial Iniciado', count: trials, icon: <Zap className="w-5 h-5 text-blue-500" />, color: "bg-blue-50" },
        { label: 'Primer Valor (Cotización)', count: firstValue, icon: <TrendingUp className="w-5 h-5 text-emerald-500" />, color: "bg-emerald-50" },
        { label: 'Trial por Vencer', count: twe, icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, color: "bg-amber-50" },
        { label: 'Checkout Iniciado', count: checkouts, icon: <CreditCard className="w-5 h-5 text-purple-500" />, color: "bg-purple-50" },
        { label: 'Suscripción Activa', count: paid, icon: <CheckCircle2 className="w-5 h-5 text-blue-600" />, color: "bg-blue-100" },
    ];

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Panel de Conversión PLG</h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">Monitoreo del embudo Trial→Paid y salud de las organizaciones.</p>
            </div>

            {/* Funnel Overview */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {funnelSteps.map((step, idx) => (
                    <div key={idx} className="relative">
                        <div className={`p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm ${step.color} h-full space-y-4`}>
                            <div className="flex items-center justify-between">
                                <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200/50">
                                    {step.icon}
                                </div>
                                <span className="text-2xl font-black text-zinc-900 dark:text-white">{step.count}</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{step.label}</p>
                            </div>
                        </div>
                        {idx < funnelSteps.length - 1 && (
                            <div className="hidden md:flex absolute top-1/2 -right-2 z-10 -translate-y-1/2 w-4 h-4 items-center justify-center bg-white border border-zinc-200 rounded-full shadow-sm">
                                <ArrowRight className="w-2 h-2 text-zinc-400" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Conversion Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Tasa de Conversión</h3>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-zinc-900 dark:text-white">{conversionRate.toFixed(1)}%</span>
                        <span className="text-zinc-500 text-sm mb-1 pb-1">de Trial a Pago</span>
                    </div>
                    <div className="mt-4 w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${conversionRate}%` }} />
                    </div>
                </div>
            </div>

            {/* At Risk Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Organizaciones en Riesgo</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Trial por vencer pronto y sin eventos de valor (Cotizaciones).</p>
                    </div>
                    <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter ring-1 ring-red-200 ring-inset">High Alert</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Organización</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Vence en</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Proyectos</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {riskOrgs.map((org: any) => (
                                <tr key={org.id} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-zinc-900 dark:text-white text-sm">{org.name}</span>
                                            <span className="text-[10px] text-zinc-400 font-mono tracking-tighter uppercase">{org.id.split('-')[0]}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-red-600 font-bold text-xs">
                                            <Calendar className="w-3 h-3" />
                                            {org.subscription?.trialEndsAt ? formatDistanceToNow(org.subscription.trialEndsAt, { addSuffix: true, locale: es }) : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                            {org._count.projects} Proyectos
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-blue-600 hover:text-blue-700 text-xs font-bold transition-colors">
                                            Ver Perfil
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {riskOrgs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 text-sm italic">
                                        No hay organizaciones críticas en este momento.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
