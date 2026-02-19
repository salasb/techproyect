import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function OpsDashboard() {
    const supabase = await createClient();

    // 1. Webhook Health (Last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const webhookStats = await prisma.stripeEvent.groupBy({
        by: ['status'],
        where: {
            createdAt: {
                gte: oneDayAgo
            }
        },
        _count: true
    });

    const successCount = (webhookStats as any[]).find(s => s.status === 'OK')?._count || 0;
    const errorCount = (webhookStats as any[]).find(s => s.status === 'ERROR')?._count || 0;
    const pendingCount = (webhookStats as any[]).find(s => s.status === 'PENDING')?._count || 0;
    const totalEvents = successCount + errorCount + pendingCount;
    const healthRate = totalEvents > 0 ? ((successCount / totalEvents) * 100).toFixed(1) : '100';

    const lastFailure = await prisma.stripeEvent.findFirst({
        where: { status: 'ERROR' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, type: true, error: true }
    });

    // 2. Subscription Counts
    const subStats = await prisma.subscription.groupBy({
        by: ['status'],
        _count: true
    });

    // 3. Queue (Recent Events)
    const recentEvents = await prisma.stripeEvent.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
    });

    // 4. Portal Activity (Audit Log)
    // "QUOTE_ACCEPT_PUBLIC" or "INVOICE_PAYMENT" (assuming payment logs exist or we count paid invoices)
    const recentActivity = await prisma.auditLog.findMany({
        where: {
            action: { in: ['QUOTE_ACCEPT_PUBLIC', 'INVOICE_PAYMENT_INIT', 'ORG_PAST_DUE', 'WEBHOOK_FAILURE'] }
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { Profile: { select: { email: true } } } // Relation is named Profile
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Vigilancia Operacional (Ops Center)</h1>
                <div className="space-x-2">
                    <Link href="/superadmin/webhooks" className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80">
                        Ver Webhooks
                    </Link>
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
                        Refrescar
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card title="Webhook Success Rate (24h)" value={`${healthRate}%`} sub={`${totalEvents} total`} color={Number(healthRate) < 95 ? "text-red-500" : "text-green-500"} />
                <Card title="Falos Recientes (24h)" value={errorCount} sub={lastFailure ? `Último: ${lastFailure.type}` : "Ninguno"} color={errorCount > 0 ? "text-red-500" : "text-gray-500"} />
                <Card title="Suscripciones Activas" value={subStats.find(s => s.status === 'ACTIVE')?._count || 0} sub="vs Total" />
                <Card title="En Mora (Past Due)" value={subStats.find(s => s.status === 'PAST_DUE')?._count || 0} sub="Acción Requerida" color="text-amber-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Queue */}
                <div className="border rounded-lg p-4 bg-card shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Cola de Eventos (Últimos 10)</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="pb-2">Tipo</th>
                                    <th className="pb-2">Estado</th>
                                    <th className="pb-2">Duración</th>
                                    <th className="pb-2">Hace</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentEvents.map((e: any) => (
                                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                                        <td className="py-2 font-mono text-xs">{e.type}</td>
                                        <td className="py-2">
                                            <Badge status={e.status} />
                                        </td>
                                        <td className="py-2">{e.durationMs ? `${e.durationMs}ms` : '-'}</td>
                                        <td className="py-2 text-muted-foreground">{formatDistanceToNow(e.createdAt, { addSuffix: true, locale: es })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Operational Log */}
                <div className="border rounded-lg p-4 bg-card shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Bitácora de Actividad Pública/Riesgo</h3>
                    <div className="space-y-4">
                        {recentActivity.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Sin actividad reciente.</p>}
                        {recentActivity.map(log => (
                            <div key={log.id} className="flex items-start justify-between border-b pb-2 last:border-0">
                                <div>
                                    <p className="font-medium text-sm">{log.action}</p>
                                    <p className="text-xs text-muted-foreground">{log.details}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {log.userName || log.Profile?.email || 'System'} • {log.organizationId?.slice(0, 8)}...
                                    </p>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                    {log.createdAt ? formatDistanceToNow(log.createdAt, { addSuffix: true, locale: es }) : '-'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Card({ title, value, sub, color = "text-foreground" }: { title: string, value: string | number, sub?: string, color?: string }) {
    return (
        <div className="border rounded-lg p-4 bg-card shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <div className={`text-2xl font-bold mt-2 ${color}`}>{value}</div>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
    );
}

function Badge({ status }: { status: string }) {
    const styles = {
        OK: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        ERROR: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800"}`}>
            {status}
        </span>
    );
}
