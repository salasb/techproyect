import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, RefreshCw, AlertCircle, Clock, CheckCircle2, MoreVertical, Archive, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ReplayButton } from "@/components/admin/ReplayButton";

export const dynamic = 'force-dynamic';

export default async function AdminStripeWebhooksPage() {
    // 1. Fetch Events (Top 50 recent + all DLQ/ERROR)
    const events = await prisma.stripeEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
    });

    const stats = {
        total: await prisma.stripeEvent.count(),
        dlq: await prisma.stripeEvent.count({ where: { status: 'DLQ' } }),
        error: await prisma.stripeEvent.count({ where: { status: 'ERROR' } }),
        pending: await prisma.stripeEvent.count({ where: { status: 'PENDING' } }),
        processing: await prisma.stripeEvent.count({ where: { status: 'PROCESSING' } }),
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/50 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">Stripe Event Queue</h1>
                    <p className="text-muted-foreground font-medium italic underline decoration-blue-500/20 underline-offset-8 tracking-tight">Gestión técnica de eventos asíncronos y DLQ.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="rounded-full px-4 py-1.5 bg-zinc-900 text-white border-zinc-800 font-mono text-[10px]">
                        Queue Worker v1.1
                    </Badge>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Total', value: stats.total, color: 'text-zinc-600', bg: 'bg-zinc-50' },
                    { label: 'Pending', value: stats.pending, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Processing', value: stats.processing, color: 'text-amber-600', bg: 'bg-amber-50 animate-pulse' },
                    { label: 'Error', value: stats.error, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'DLQ', value: stats.dlq, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200 border' },
                ].map(s => (
                    <div key={s.label} className={cn("p-6 rounded-3xl space-y-1", s.bg)}>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{s.label}</p>
                        <p className={cn("text-2xl font-black italic tracking-tighter", s.color)}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Events Table */}
            <Card className="rounded-[2.5rem] shadow-sm border-border/50 overflow-hidden">
                <CardHeader className="p-8 border-b border-border/50 bg-muted/5 flex flex-row items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        Historial de Eventos Recientes
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/5 border-b border-border/50">
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Evento</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estado / Intentos</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Org ID</th>
                                <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {events.map((ev) => (
                                <tr key={ev.id} className="group hover:bg-muted/5 transition-colors">
                                    <td className="p-6">
                                        <div className="space-y-1">
                                            <p className="font-bold text-sm tracking-tight text-foreground uppercase">{ev.type}</p>
                                            <p className="text-[10px] text-zinc-400 font-mono">{ev.id}</p>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <Badge className={cn(
                                                "text-[9px] font-black uppercase py-0.5 px-2",
                                                ev.status === 'OK' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                ev.status === 'DLQ' ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse" :
                                                ev.status === 'ERROR' ? "bg-orange-50 text-orange-700 border-orange-100" :
                                                ev.status === 'PROCESSING' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                "bg-zinc-100 text-zinc-600"
                                            )}>
                                                {ev.status}
                                            </Badge>
                                            <span className="text-[10px] font-bold text-zinc-400">
                                                {ev.attempts} {ev.attempts === 1 ? 'intento' : 'intentos'}
                                            </span>
                                        </div>
                                        {ev.error && (
                                            <p className="text-[9px] text-rose-600 mt-1 max-w-[200px] truncate italic" title={ev.error}>
                                                Error: {ev.error}
                                            </p>
                                        )}
                                    </td>
                                    <td className="p-6">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase">{formatDistanceToNow(new Date(ev.createdAt), { locale: es, addSuffix: true })}</p>
                                    </td>
                                    <td className="p-6">
                                        <p className="text-[10px] font-mono text-zinc-400">{ev.orgId?.substring(0,8) || 'SYSTEM'}</p>
                                    </td>
                                    <td className="p-6 text-right">
                                        <ReplayButton eventId={ev.id} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
