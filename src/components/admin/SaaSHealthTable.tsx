"use client";

import { Building2, Users, Activity, CheckCircle2, AlertTriangle, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface OrgMetric {
    id: string;
    name: string;
    plan: string;
    status: string;
    createdAt: string;
    usersCount: number;
    metrics: {
        wau: number;
        mau: number;
        activationDays: number | string;
        moduleUsage: {
            crm: number;
            quotes: number;
            projects: number;
            inventory: number;
        };
    };
    health: {
        score: number;
        status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
        lastActivityAt: string | null;
    };
}

const healthConfig = {
    HEALTHY: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", label: "Saludable" },
    WARNING: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50", label: "Riesgo" },
    CRITICAL: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", label: "Crítico" },
};

export function SaaSHealthTable({ orgs }: { orgs: OrgMetric[] }) {
    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-zinc-50/50">
                <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Salud de Organizaciones (SaaS)
                </h2>
                <div className="flex gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <div className="flex items-center gap-1.5 border-r border-border pr-4">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> {orgs.filter(o => o.health.status === 'HEALTHY').length}
                    </div>
                    <div className="flex items-center gap-1.5 border-r border-border pr-4">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> {orgs.filter(o => o.health.status === 'WARNING').length}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500" /> {orgs.filter(o => o.health.status === 'CRITICAL').length}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-50/30 text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-border">
                            <th className="px-6 py-4">Organización</th>
                            <th className="px-6 py-4">Salud</th>
                            <th className="px-6 py-4 text-center">Usuarios</th>
                            <th className="px-6 py-4 text-center">WAU/MAU</th>
                            <th className="px-6 py-4">Adopción de Módulos</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {orgs.map((org) => {
                            const config = healthConfig[org.health.status];
                            const HealthIcon = config.icon;

                            return (
                                <tr key={org.id} className="hover:bg-zinc-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold shadow-inner">
                                                {org.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-foreground">{org.name}</div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    Creada el {format(new Date(org.createdAt), 'dd MMM yyyy', { locale: es })}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.color}`}>
                                            <HealthIcon className="w-3 h-3" />
                                            {config.label} ({org.health.score}%)
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm font-semibold">{org.usersCount}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="text-sm font-semibold">
                                            {org.metrics.wau} <span className="text-[10px] text-muted-foreground">/</span> {org.metrics.mau}
                                        </div>
                                        <div className="w-16 h-1 bg-zinc-100 rounded-full mx-auto mt-1 overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${org.metrics.mau > 0 ? (org.metrics.wau / org.metrics.mau) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1.5">
                                            {Object.entries(org.metrics.moduleUsage).map(([mod, count]) => (
                                                <div
                                                    key={mod}
                                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${count > 0 ? 'bg-primary/5 text-primary border border-primary/10' : 'bg-zinc-100 text-zinc-400'}`}
                                                    title={`${mod}: ${count} registros`}
                                                >
                                                    {mod[0]}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-zinc-400 group-hover:text-primary transition-colors">
                                        <Link href={`/admin/orgs/${org.id}`}>
                                            <ArrowRight className="w-4 h-4 ml-auto" />
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {orgs.length === 0 && (
                <div className="p-12 text-center text-muted-foreground text-sm italic">
                    No hay organizaciones registradas.
                </div>
            )}
        </div>
    );
}
