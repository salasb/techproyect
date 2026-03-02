import { SupportService } from "@/services/support-service";
import { requireOperationalScope } from "@/lib/auth/server-resolver";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TicketStatus, TicketPriority } from "@prisma/client";
import Link from "next/link";
import { ChevronLeft, MessageSquare, Clock, CheckCircle2, User, Building2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { TicketMessageThread } from "@/components/support/TicketMessageThread";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";

export default async function TicketDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const scope = await requireOperationalScope();
    const ticket = await SupportService.getTicketDetails(params.id, scope.orgId);

    if (!ticket) notFound();

    const statusMap: Record<TicketStatus, { label: string, color: string, icon: any }> = {
        OPEN: { label: 'Abierto', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: MessageSquare },
        IN_PROGRESS: { label: 'En Progreso', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
        RESOLVED: { label: 'Resuelto', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    };

    const status = statusMap[ticket.status];
    const StatusIcon = status.icon;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/settings/support">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold tracking-tight">{ticket.title}</h2>
                            <Badge variant="outline" className={`text-[10px] font-black uppercase ${status.color}`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {status.label}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                            Creado por {ticket.profile.name} • {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: es })}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Description Card */}
                    <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden bg-muted/5">
                        <CardContent className="p-8">
                            <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap italic">
                                &quot;{ticket.description}&quot;
                            </p>
                        </CardContent>
                    </Card>

                    {/* Messages Thread */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground ml-2">Conversación</h3>
                        <TicketMessageThread 
                            ticketId={ticket.id} 
                            messages={ticket.messages as any} 
                            isResolved={ticket.status === 'RESOLVED'} 
                        />
                    </div>
                </div>

                <aside className="space-y-6">
                    <Card className="rounded-3xl shadow-sm border-border/50 sticky top-8">
                        <CardHeader className="p-6 border-b border-border/50 bg-muted/5">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detalles del Ticket</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Prioridad</span>
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        ticket.priority === 'P0' ? "bg-red-500" : 
                                        ticket.priority === 'P1' ? "bg-orange-500" :
                                        ticket.priority === 'P2' ? "bg-blue-500" : "bg-slate-400"
                                    )} />
                                    <span className="font-bold text-sm">Prioridad {ticket.priority}</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Organización</span>
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-zinc-400" />
                                    <span className="font-medium text-sm">{(ticket.organization as any).name}</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Ticket ID</span>
                                <div className="font-mono text-[10px] bg-muted px-2 py-1 rounded select-all truncate">
                                    {ticket.id}
                                </div>
                            </div>

                            {ticket.resolvedAt && (
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Resuelto</span>
                                    <div className="flex items-center gap-2 text-emerald-600">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="font-bold text-sm">
                                            {formatDistanceToNow(new Date(ticket.resolvedAt), { addSuffix: true, locale: es })}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    );
}

