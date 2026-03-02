import { SupportService } from "@/services/support-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TicketStatus, TicketPriority } from "@prisma/client";
import Link from "next/link";
import { MessageSquare, Clock, CheckCircle2, AlertCircle, Building2, User, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default async function AdminSupportPage() {
    const tickets = await SupportService.getAllTickets();

    const statusMap: Record<TicketStatus, { label: string, color: string, icon: any }> = {
        OPEN: { label: 'Abierto', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: MessageSquare },
        IN_PROGRESS: { label: 'En Progreso', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
        RESOLVED: { label: 'Resuelto', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    };

    const priorityMap: Record<TicketPriority, { label: string, color: string, bg: string }> = {
        P0: { label: 'P0', color: 'text-red-700', bg: 'bg-red-50 border-red-100' },
        P1: { label: 'P1', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
        P2: { label: 'P2', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
        P3: { label: 'P3', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-100' },
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/50 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-foreground tracking-tighter bg-gradient-to-r from-blue-700 to-indigo-500 bg-clip-text text-transparent italic uppercase">Support Desk v1.0</h1>
                    <p className="text-muted-foreground font-medium underline decoration-blue-500/20 underline-offset-8 tracking-tight italic">Gestión global de requerimientos y atención al cliente.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="rounded-full text-[10px] font-black uppercase tracking-widest px-6 h-10 border-border/50">
                        <Filter className="w-3 h-3 mr-2" /> Filtrar Tickets
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {tickets.length === 0 ? (
                    <div className="p-20 text-center border-2 border-dashed border-border rounded-[3rem] bg-muted/5">
                        <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">No hay tickets pendientes en la cola.</p>
                    </div>
                ) : (
                    tickets.map((ticket) => {
                        const status = statusMap[ticket.status];
                        const priority = priorityMap[ticket.priority];
                        const StatusIcon = status.icon;

                        return (
                            <Link key={ticket.id} href={`/admin/support/${ticket.id}`}>
                                <Card className="rounded-[2rem] border-border/50 hover:border-blue-500/50 transition-all hover:shadow-2xl hover:shadow-blue-500/5 group relative overflow-hidden">
                                    {ticket.status === 'OPEN' && (
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                                    )}
                                    {ticket.priority === 'P0' && (
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 animate-pulse" />
                                    )}
                                    <CardContent className="p-8">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                            <div className="flex-1 space-y-4">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <Badge className={cn("text-[9px] font-black uppercase py-0.5 px-2.5", priority.bg, priority.color)}>
                                                        {priority.label}
                                                    </Badge>
                                                    <h4 className="text-xl font-black tracking-tight text-foreground group-hover:text-blue-600 transition-colors uppercase">{ticket.title}</h4>
                                                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase py-0.5 px-2.5", status.color)}>
                                                        <StatusIcon className="w-3 h-3 mr-1.5" />
                                                        {status.label}
                                                    </Badge>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center border border-border/50">
                                                            <Building2 className="w-3 h-3 text-zinc-400" />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">{(ticket.organization as any).name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center border border-border/50">
                                                            <User className="w-3 h-3 text-zinc-400" />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">{ticket.profile.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center border border-border/50">
                                                            <Clock className="w-3 h-3 text-zinc-400" />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">hace {formatDistanceToNow(new Date(ticket.createdAt), { locale: es })}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-[8px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-1">Hilo de Conversación</p>
                                                    <p className="text-lg font-black italic tracking-tighter text-zinc-900">{ticket._count.messages} <span className="text-[10px] not-italic font-bold uppercase text-zinc-400">Msgs</span></p>
                                                </div>
                                                <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-border/50 flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors">
                                                    <MessageSquare className="w-5 h-5 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}
