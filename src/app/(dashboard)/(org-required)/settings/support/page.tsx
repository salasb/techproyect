import { SupportService } from "@/services/support-service";
import { requireOperationalScope } from "@/lib/auth/server-resolver";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TicketStatus, TicketPriority } from "@prisma/client";
import Link from "next/link";
import { MessageSquare, Plus, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default async function SupportTicketsPage() {
    const scope = await requireOperationalScope();
    const tickets = await SupportService.getOrganizationTickets(scope.orgId);

    const statusMap: Record<TicketStatus, { label: string, color: string, icon: any }> = {
        OPEN: { label: 'Abierto', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: MessageSquare },
        IN_PROGRESS: { label: 'En Progreso', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
        RESOLVED: { label: 'Resuelto', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    };

    const priorityMap: Record<TicketPriority, { label: string, color: string }> = {
        P0: { label: 'Crítica', color: 'text-red-600' },
        P1: { label: 'Alta', color: 'text-orange-600' },
        P2: { label: 'Media', color: 'text-blue-600' },
        P3: { label: 'Baja', color: 'text-slate-600' },
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent inline-block mb-1">Centro de Soporte</h2>
                    <p className="text-muted-foreground">Gestiona tus consultas y reportes técnicos.</p>
                </div>
                <Link href="/settings/support/new">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                        <Plus className="w-4 h-4 mr-2" /> Nuevo Ticket
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {tickets.length === 0 ? (
                    <Card className="rounded-[2rem] border-dashed border-2 p-12 text-center">
                        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No tienes tickets abiertos</h3>
                        <p className="text-muted-foreground mb-6">Si tienes alguna duda o problema técnico, nuestro equipo está para ayudarte.</p>
                        <Link href="/settings/support/new">
                            <Button variant="outline" className="rounded-xl">Crear mi primer ticket</Button>
                        </Link>
                    </Card>
                ) : (
                    tickets.map((ticket) => {
                        const status = statusMap[ticket.status];
                        const priority = priorityMap[ticket.priority];
                        const StatusIcon = status.icon;

                        return (
                            <Link key={ticket.id} href={`/settings/support/${ticket.id}`}>
                                <Card className="rounded-2xl hover:border-primary/50 transition-all hover:shadow-md cursor-pointer group">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{ticket.title}</h4>
                                                    <Badge variant="outline" className={`text-[10px] font-black uppercase ${status.color}`}>
                                                        <StatusIcon className="w-3 h-3 mr-1" />
                                                        {status.label}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                                                    <span className="flex items-center gap-1">
                                                        <AlertCircle className={`w-3.5 h-3.5 ${priority.color}`} />
                                                        Prioridad {priority.label}
                                                    </span>
                                                    <span>•</span>
                                                    <span>Creado hace {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: es })}</span>
                                                    <span>•</span>
                                                    <span>{ticket._count.messages} mensajes</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="sm" className="rounded-lg group-hover:bg-primary/5">
                                                    Ver detalles →
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })
                )}
            </div>

            {/* SLA Info */}
            <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-6 flex items-start gap-4">
                <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl shadow-sm shrink-0">
                    <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                    <h4 className="text-indigo-900 dark:text-indigo-300 font-bold text-sm uppercase tracking-tight">Política de Respuesta (SLA)</h4>
                    <p className="text-indigo-700 dark:text-indigo-400 text-xs leading-relaxed mt-1 font-medium italic">
                        Nuestro compromiso es responder a tickets P0 en menos de 4 horas, P1 en menos de 8 horas y otros en un máximo de 24 horas hábiles.
                    </p>
                </div>
            </div>
        </div>
    );
}
