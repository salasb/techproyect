import { SupportService } from "@/services/support-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TicketStatus, TicketPriority } from "@prisma/client";
import Link from "next/link";
import { ChevronLeft, MessageSquare, Clock, CheckCircle2, User, Building2, ShieldCheck, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { TicketMessageThread } from "@/components/support/TicketMessageThread";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";

export default async function AdminTicketDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const ticket = await SupportService.getTicketDetails(params.id);

    if (!ticket) notFound();

    const statusMap: Record<TicketStatus, { label: string, color: string, icon: any }> = {
        OPEN: { label: 'Abierto', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: MessageSquare },
        IN_PROGRESS: { label: 'En Progreso', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
        RESOLVED: { label: 'Resuelto', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    };

    const status = statusMap[ticket.status];
    const StatusIcon = status.icon;

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20">
            {/* Header Admin */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/50 pb-8">
                <div className="flex items-center gap-6">
                    <Link href="/admin/support">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-all cursor-pointer border border-border/50">
                            <ChevronLeft className="w-6 h-6 text-zinc-600" />
                        </div>
                    </Link>
                    <div className="space-y-1">
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase italic">{ticket.title}</h1>
                            <Badge variant="outline" className={cn("text-[9px] font-black uppercase py-0.5 px-2.5", status.color)}>
                                <StatusIcon className="w-3 h-3 mr-1.5" />
                                {status.label}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground font-medium flex items-center gap-2">
                            Ticket Desk ID: <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">{ticket.id}</code>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Admin Actions */}
                    <Button variant="outline" className="rounded-full text-[10px] font-black uppercase tracking-widest px-6 h-10 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Resolver Ticket
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
                <div className="lg:col-span-2 space-y-10">
                    {/* User Context Summary */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-[2.5rem] p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-xl shadow-inner">
                                <Mail className="w-4 h-4 text-blue-600" />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-900">Requerimiento Original</h3>
                        </div>
                        <p className="text-blue-950 font-medium leading-relaxed italic text-lg opacity-80 whitespace-pre-wrap">
                            &quot;{ticket.description}&quot;
                        </p>
                    </div>

                    {/* Messages Thread Component */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                                Hilo de Soporte
                            </h3>
                            <Badge variant="outline" className="text-[8px] font-bold border-indigo-200 text-indigo-600 bg-indigo-50 uppercase">Canal Seguro SSL</Badge>
                        </div>
                        <TicketMessageThread 
                            ticketId={ticket.id} 
                            messages={ticket.messages as any} 
                            isResolved={ticket.status === 'RESOLVED'} 
                        />
                    </div>
                </div>

                <aside className="space-y-6 lg:sticky lg:top-8">
                    {/* Org/User Card */}
                    <Card className="rounded-[2.5rem] shadow-sm border-border/50 overflow-hidden">
                        <CardHeader className="p-8 border-b border-border/50 bg-muted/5">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                                Contexto del Cliente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="space-y-2">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Organización</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center border border-border/50">
                                        <Building2 className="w-5 h-5 text-zinc-400" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="font-black text-sm uppercase tracking-tight text-foreground">{(ticket.organization as any).name}</p>
                                        <p className="text-[10px] text-zinc-400 font-bold font-mono">ORG_ID: {ticket.organizationId.substring(0, 8)}...</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Solicitante</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                        <User className="w-5 h-5 text-indigo-500" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="font-black text-sm uppercase tracking-tight text-foreground">{ticket.profile.name}</p>
                                        <p className="text-[10px] text-zinc-400 font-bold">{ticket.profile.email}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-border/50">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Atención Prioritaria</span>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-3 h-3 rounded-full shadow-sm",
                                        ticket.priority === 'P0' ? "bg-red-500 animate-pulse" : 
                                        ticket.priority === 'P1' ? "bg-orange-500" :
                                        ticket.priority === 'P2' ? "bg-blue-500" : "bg-slate-400"
                                    )} />
                                    <span className="font-black text-xs uppercase tracking-widest text-zinc-700">Prioridad {ticket.priority}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Timeline Card */}
                    <Card className="rounded-[2.5rem] border-dashed border-2 border-border bg-slate-50/30 p-8">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            Registro Operativo
                        </h3>
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="w-0.5 h-full bg-blue-100 relative mt-2">
                                    <div className="absolute -left-[3px] top-0 w-2 h-2 rounded-full bg-blue-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-zinc-900 tracking-tight">Creado</p>
                                    <p className="text-[10px] font-medium text-zinc-500 italic">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: es })}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-0.5 h-full bg-amber-100 relative mt-2">
                                    <div className="absolute -left-[3px] top-0 w-2 h-2 rounded-full bg-amber-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-zinc-900 tracking-tight">Última Actividad</p>
                                    <p className="text-[10px] font-medium text-zinc-500 italic">{formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true, locale: es })}</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </aside>
            </div>
        </div>
    );
}
