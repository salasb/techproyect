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
    createdAt: Date;
    health: {
        status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'INCOMPLETE';
        score: number;
        reasons: string[];
        lastActivityAt: Date | null;
    };
    billing: {
        status: string;
        provider: string | null;
        trialEndsAt: Date | null;
    };
    metrics: {
        usersCount: number;
        projectsCount: number;
        quotesCount: number;
    };
}

const healthConfig = {
    HEALTHY: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", label: "Saludable" },
    WARNING: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50", label: "Riesgo" },
    CRITICAL: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", label: "Crítico" },
    INCOMPLETE: { icon: Activity, color: "text-blue-400", bg: "bg-blue-50", label: "Configurando" },
};

export function SaaSHealthTable({ orgs }: { orgs: OrgMetric[] }) {
    return (
        <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-border flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
                <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Estado Operativo Global
                </h2>
                <div className="flex gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
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
                        <tr className="bg-zinc-50/30 dark:bg-zinc-900/30 text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-border">
                            <th className="px-6 py-4">Organización</th>
                            <th className="px-6 py-4">Salud / Riesgo</th>
                            <th className="px-6 py-4">Billing</th>
                            <th className="px-6 py-4 text-center">Métricas</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {orgs.map((org) => {
                            const config = healthConfig[org.health.status] || healthConfig.WARNING;
                            const HealthIcon = config.icon;

                            return (
                                <tr key={org.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold shadow-inner">
                                                {org.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-foreground">{org.name}</div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    ID: {org.id.substring(0, 8)}... • {format(new Date(org.createdAt), 'dd MMM yy', { locale: es })}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1.5">
                                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.color}`}>
                                                <HealthIcon className="w-3 h-3" />
                                                {config.label} ({org.health.score}%)
                                            </div>
                                            {org.health.reasons.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {org.health.reasons.map((reason, idx) => (
                                                        <span key={idx} className="text-[9px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/5 px-1 rounded border border-amber-500/10">
                                                            {reason}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-[10px] font-bold uppercase ${['active', 'trialing'].includes(org.billing.status.toLowerCase()) ? 'text-emerald-600' : 'text-zinc-500'}`}>
                                                {org.billing.status}
                                            </span>
                                            {org.billing.trialEndsAt && (
                                                <span className="text-[9px] text-muted-foreground">
                                                    Vence: {format(new Date(org.billing.trialEndsAt), 'dd/MM/yy')}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center items-center gap-4">
                                            <div className="text-center">
                                                <div className="text-xs font-bold">{org.metrics.usersCount}</div>
                                                <div className="text-[8px] text-muted-foreground uppercase">Users</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xs font-bold text-blue-600">{org.metrics.projectsCount}</div>
                                                <div className="text-[8px] text-muted-foreground uppercase">Projs</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xs font-bold text-purple-600">{org.metrics.quotesCount}</div>
                                                <div className="text-[8px] text-muted-foreground uppercase">Quotes</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/admin/orgs/${org.id}`} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg inline-block transition-colors">
                                            <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-primary transition-colors" />
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

