"use client";

import { AlertStatus, SentinelSeverity, SentinelType } from "@prisma/client";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface SentinelAlert {
    id: string;
    type: SentinelType;
    severity: SentinelSeverity;
    title: string;
    message: string;
    status: AlertStatus;
    createdAt: Date;
    metadata: any;
}

interface SentinelAlertsPanelProps {
    alerts: SentinelAlert[];
}

const severityMap = {
    S0: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-100", label: "Crítico" },
    S1: { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100", label: "Alto" },
    S2: { icon: Info, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", label: "Medio" },
    S3: { icon: CheckCircle2, color: "text-zinc-500", bg: "bg-zinc-50", border: "border-zinc-100", label: "Bajo" },
};

export function SentinelAlertsPanel({ alerts }: SentinelAlertsPanelProps) {
    if (alerts.length === 0) {
        return (
            <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-zinc-300" />
                </div>
                <div>
                    <h3 className="text-sm font-medium text-foreground">Sistema Estable</h3>
                    <p className="text-xs text-muted-foreground">Sentinel no ha detectado riesgos operativos.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="p-4 border-b border-border bg-zinc-50/50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Alertas Sentinel</h3>
                </div>
                <span className="text-[10px] font-bold bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full">
                    {alerts.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px] divide-y divide-border">
                {alerts.map((alert) => {
                    const config = severityMap[alert.severity] || severityMap.S3;
                    const Icon = config.icon;

                    return (
                        <div key={alert.id} className={`p-4 transition-colors hover:bg-zinc-50/80`}>
                            <div className="flex gap-3">
                                <div className={`mt-0.5 p-1.5 rounded-lg ${config.bg} ${config.color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] font-bold uppercase ${config.color}`}>
                                            {config.label}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: es })}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-semibold text-foreground leading-tight">{alert.title}</h4>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>

                                    {(alert.metadata as any)?.projectId && (
                                        <Link
                                            href={`/projects/${(alert.metadata as any).projectId}`}
                                            className="inline-flex items-center text-[10px] font-bold text-primary hover:underline mt-2 group"
                                        >
                                            Ver contexto <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
