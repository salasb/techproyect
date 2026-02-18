import { createClient } from "@/lib/supabase/server";
import { ActivationService } from "@/services/activation-service";
import prisma from "@/lib/prisma";
import {
    Users,
    Target,
    ArrowRight,
    CheckCircle2,
    Clock,
    Activity,
    Filter
} from "lucide-react";

export default async function ActivationDashboard() {
    const supabase = await createClient();

    // 1. Fetch Funnel Data
    const events = await (prisma as any).activationEvent.findMany();
    const stats: any = {};
    const eventNames = [
        'ORG_CREATED',
        'FIRST_PROJECT_CREATED',
        'FIRST_QUOTE_DRAFT_CREATED',
        'FIRST_QUOTE_SENT'
    ];

    eventNames.forEach(name => {
        stats[name] = new Set(events.filter((e: any) => e.eventName === name).map((e: any) => e.organizationId)).size;
    });

    // 2. Fetch Organizations with Stats
    const { data: orgs } = await supabase
        .from('Organization')
        .select(`
            id,
            name,
            mode,
            status,
            createdAt,
            stats:OrganizationStats(*),
            subscription:Subscription(status)
        `)
        .order('createdAt', { ascending: false });

    return (
        <div className="p-8 space-y-8 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Activación & Funnel</h1>
                    <p className="text-muted-foreground">Monitoreo de adopción PLG y Time-to-Value.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium shadow-sm hover:bg-zinc-50 transition-colors">
                        <Filter className="w-4 h-4" />
                        Filtros
                    </button>
                </div>
            </header>

            {/* Funnel Visualizer */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {eventNames.map((name, i) => (
                    <div key={name} className="relative bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <Target className="w-12 h-12" />
                        </div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{name.replace('FIRST_', '').replace('_', ' ')}</p>
                        <p className="text-4xl font-extrabold">{stats[name] || 0}</p>
                        <div className="mt-4 flex items-center gap-2">
                            {i > 0 && stats[eventNames[i - 1]] > 0 ? (
                                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                    {Math.round((stats[name] / stats[eventNames[i - 1]]) * 100)}% Conv.
                                </span>
                            ) : null}
                            {i === 0 && <span className="text-xs text-zinc-400">Punto de entrada</span>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Org Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden text-sm">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <h3 className="font-bold">Salud por Organización</h3>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 font-medium">
                            <th className="px-6 py-4">Organización</th>
                            <th className="px-6 py-4">Modo</th>
                            <th className="px-6 py-4">Suscripción</th>
                            <th className="px-6 py-4">Etapa</th>
                            <th className="px-6 py-4">TTV (Días)</th>
                            <th className="px-6 py-4 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {orgs?.map((org: any) => {
                            const stats = org.stats as any;
                            const stage = stats?.attributes?.stage || 'REGISTERED';
                            return (
                                <tr key={org.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-6 py-4 font-semibold">{org.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${org.mode === 'TEAM' ? 'bg-indigo-100 text-indigo-700' : 'bg-zinc-200 text-zinc-700'}`}>
                                            {org.mode}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-1.5 ${org.subscription?.status === 'ACTIVE' ? 'text-emerald-600' : 'text-zinc-500'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${org.subscription?.status === 'ACTIVE' ? 'bg-emerald-600 animate-pulse' : 'bg-zinc-400'}`} />
                                            {org.subscription?.status || 'FREE'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className={`w-4 h-4 ${stage === 'ACTIVATED' ? 'text-emerald-500' : 'text-zinc-300'}`} />
                                            <span className="font-medium text-zinc-600 dark:text-zinc-400 uppercase text-[10px] tracking-wide">{stage}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-zinc-500">{stats?.ttvDays?.toFixed(1) || '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                            <Activity className="w-4 h-4 text-zinc-400" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
