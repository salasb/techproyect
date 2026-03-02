import React from "react";
import { createClient } from "@/lib/supabase/server";
import { OrganizationProfileForm } from "@/components/settings/OrganizationProfileForm";
import { updateOrganizationAction } from "@/actions/organizations";
import { getOrganizationId } from "@/lib/current-org";
import prisma from "@/lib/prisma";
import { 
    Activity, 
    ShieldCheck, 
    CreditCard, 
    Users, 
    Zap, 
    CheckCircle2, 
    AlertTriangle,
    ChevronRight,
    Building2,
    FileText,
    Receipt,
    History,
    ExternalLink
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GlobalAuditLog } from "@/components/settings/GlobalAuditLog";
import { TeamMemberList } from "@/components/team/member-list";
import { isAdmin } from "@/lib/permissions";
import { createPortalSession } from "@/actions/billing";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AcceptQuoteButton } from "@/components/commercial/AcceptQuoteButton";
import { InvoicePdfButton } from "@/components/invoices/InvoicePdfButton";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function OrganizationHubPage(props: { searchParams: Promise<{ tab?: string }> }) {
    const searchParams = await props.searchParams;
    const initialTab = searchParams.tab || "overview";
    const supabase = await createClient();
    const orgId = await getOrganizationId();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { 
            subscription: true,
            stats: true,
            OrganizationMember: {
                include: { profile: true }
            },
            _count: {
                select: { projects: true }
            }
        }
    });

    if (!org) {
        return <div className="p-8 text-center text-muted-foreground italic">Organización no encontrada</div>;
    }

    // 1. Fetch Commercial Data
    const quotes = await prisma.quote.findMany({
        where: { project: { organizationId: orgId } },
        include: { project: true },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    const invoices = await prisma.invoice.findMany({
        where: { organizationId: orgId },
        include: { project: true },
        orderBy: { updatedAt: 'desc' },
        take: 10
    });

    const auditLogs = await prisma.auditLog.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    const subscription = org.subscription;
    const isPastDue = subscription?.status === 'PAST_DUE';
    
    // v1.3 Advanced Health Check (Real Logic)
    const members = org.OrganizationMember;
    const adminCount = members.filter(m => isAdmin(m.role)).length;
    const hasAdmins = adminCount > 0;
    const hasProjects = org._count.projects > 0;
    const hasSentQuote = quotes.some(q => q.status === 'SENT' || q.status === 'ACCEPTED');

    const checklistSteps = [
        {
            id: "profile",
            title: "Identidad Corporativa",
            description: "RUT y Nombre fiscal configurados.",
            completed: !!org.rut && !org.name.includes("Mi Organización"),
            href: "?tab=profile"
        },
        {
            id: "team",
            title: "Gobernanza de Equipo",
            description: "Asegura al menos un administrador.",
            completed: hasAdmins,
            href: "?tab=team"
        },
        {
            id: "billing",
            title: "Setup Financiero",
            description: "Método de pago vinculado en Stripe.",
            completed: !!subscription?.providerCustomerId,
            href: "/settings/billing"
        },
        {
            id: "operation",
            title: "Primer Ciclo Comercial",
            description: "Crea un proyecto y envía una propuesta.",
            completed: hasProjects && hasSentQuote,
            href: "/projects/new"
        }
    ];

    const completedSteps = checklistSteps.filter(s => s.completed).length;
    const progressPercent = Math.round((completedSteps / checklistSteps.length) * 100);

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Hub Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic">
                            {org.name}
                        </h1>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium italic flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        Portal de Gestión y Autoservicio v1.3
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Plan Actual</span>
                        <Badge variant="outline" className="bg-white dark:bg-zinc-950 font-bold uppercase text-xs py-1 px-4 border-zinc-200">
                            {org.plan || 'FREE'}
                        </Badge>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estado</span>
                        <Badge className={`${isPastDue ? 'bg-rose-600' : 'bg-emerald-600'} text-white font-black uppercase text-xs py-1 px-4 border-none shadow-sm`}>
                            {subscription?.status || 'SIN PLAN'}
                        </Badge>
                    </div>
                </div>
            </div>

            <Tabs defaultValue={initialTab} className="w-full">
                <div className="bg-zinc-100 dark:bg-zinc-900/50 p-1.5 rounded-[2rem] mb-10 inline-flex w-full md:w-auto overflow-x-auto no-scrollbar">
                    <TabsList className="bg-transparent h-auto gap-1">
                        <TabsTrigger value="overview" className="rounded-[1.5rem] px-8 py-2.5 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-800 transition-all gap-2">
                            <Zap className="w-3.5 h-3.5" /> Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="commercial" className="rounded-[1.5rem] px-8 py-2.5 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-800 transition-all gap-2">
                            <FileText className="w-3.5 h-3.5" /> Comercial
                        </TabsTrigger>
                        <TabsTrigger value="team" className="rounded-[1.5rem] px-8 py-2.5 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-800 transition-all gap-2">
                            <Users className="w-3.5 h-3.5" /> Equipo
                        </TabsTrigger>
                        <TabsTrigger value="profile" className="rounded-[1.5rem] px-8 py-2.5 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-800 transition-all gap-2">
                            <Building2 className="w-3.5 h-3.5" /> Perfil
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-10 focus-visible:outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Status Card */}
                        <Card className="rounded-[3rem] border-none shadow-2xl bg-zinc-900 text-white p-10 flex flex-col justify-between group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                <Activity className="w-32 h-32" />
                            </div>
                            <div className="space-y-8 relative z-10">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Estado Operativo</h3>
                                <div className="space-y-6">
                                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-colors">
                                        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">Salud de la Org</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                                            <span className="text-3xl font-black tracking-tighter italic">Óptima</span>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-colors">
                                        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">Presupuesto EB</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl font-black tracking-tighter italic text-indigo-400">99.9%</span>
                                            <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 text-[8px] font-black">SLO OK</Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <form action={createPortalSession} className="mt-8 relative z-10">
                                <Button className="w-full rounded-2xl bg-white text-zinc-900 hover:bg-zinc-200 font-black uppercase tracking-widest text-[10px] h-14 shadow-lg">
                                    Gestionar Facturación <ExternalLink className="w-3.5 h-3.5 ml-2" />
                                </Button>
                            </form>
                        </Card>

                        {/* Checklist */}
                        <Card className="lg:col-span-2 rounded-[3.5rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-10 shadow-xl relative overflow-hidden">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b border-zinc-100 dark:border-zinc-900 pb-8">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-3 italic">
                                        <Zap className="w-6 h-6 text-indigo-600 fill-indigo-600" />
                                        Activación de Sistemas
                                    </h3>
                                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide italic">Sigue estos pasos para habilitar el 100% de las capacidades de TechWise.</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-baseline justify-end gap-1">
                                        <span className="text-4xl font-black text-indigo-600 italic tracking-tighter">{progressPercent}%</span>
                                        <span className="text-xs font-black text-zinc-300 uppercase">Completado</span>
                                    </div>
                                    <div className="w-48 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-2 shadow-inner border border-zinc-200/50 dark:border-zinc-700/50">
                                        <div className="h-full bg-indigo-600 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(79,70,229,0.4)]" style={{ width: `${progressPercent}%` }} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {checklistSteps.map((step) => (
                                    <Link key={step.id} href={step.href}>
                                        <div className={cn(
                                            "flex items-center justify-between p-5 rounded-[2rem] border transition-all duration-300 group/item",
                                            step.completed 
                                                ? "bg-emerald-50/30 border-emerald-100/50 dark:bg-emerald-900/5 dark:border-emerald-900/20" 
                                                : "bg-zinc-50 border-zinc-100 hover:border-indigo-300 dark:bg-zinc-900/30 dark:border-zinc-800 dark:hover:border-indigo-700"
                                        )}>
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                                                    step.completed 
                                                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 scale-95" 
                                                        : "bg-white text-zinc-400 dark:bg-zinc-800 shadow-sm group-hover/item:scale-110 group-hover/item:text-indigo-600"
                                                )}>
                                                    {step.completed ? <CheckCircle2 className="w-6 h-6 shadow-sm" /> : <ChevronRight className="w-6 h-6" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className={cn(
                                                        "text-[11px] font-black uppercase tracking-tight",
                                                        step.completed ? "text-emerald-700 dark:text-emerald-400 line-through decoration-emerald-200" : "text-zinc-900 dark:text-zinc-100"
                                                    )}>
                                                        {step.title}
                                                    </h4>
                                                    <p className="text-[9px] font-bold text-zinc-400 mt-0.5 truncate uppercase tracking-tighter">{step.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Quick Access Tiles v1.3 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card className="rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm hover:shadow-lg transition-all group">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-6 flex items-center gap-2">
                                <History className="w-3.5 h-3.5 text-indigo-500" /> Auditoría Reciente
                            </h3>
                            <div className="space-y-4">
                                {auditLogs.length > 0 ? (
                                    <ul className="space-y-3">
                                        {auditLogs.map(log => (
                                            <li key={log.id} className="text-[10px] flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 group-hover:bg-white dark:group-hover:bg-zinc-900 transition-colors">
                                                <Badge variant="outline" className="text-[7px] py-0 px-1.5 h-4 border-zinc-200 opacity-60 shrink-0 font-bold">{(log.action || 'OP').substring(0,8)}</Badge>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-zinc-700 dark:text-zinc-300 truncate italic">"{log.details}"</p>
                                                    <p className="text-[8px] text-zinc-400 mt-0.5 font-medium">{format(new Date(log.createdAt || ""), 'HH:mm • dd MMM', { locale: es })}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-[10px] italic text-zinc-400">Sin registros disponibles.</p>
                                )}
                                <Button variant="link" size="sm" className="h-auto p-0 text-[10px] font-black uppercase text-indigo-600 tracking-widest mt-2" asChild>
                                    <Link href="/settings/history">Ver historial completo</Link>
                                </Button>
                            </div>
                        </Card>

                        <Card className="rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm hover:shadow-lg transition-all group">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-6 flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-blue-500" /> Mis Cotizaciones
                            </h3>
                            <div className="space-y-4">
                                {quotes.length > 0 ? (
                                    <ul className="space-y-3">
                                        {quotes.slice(0, 4).map(q => (
                                            <li key={q.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black uppercase truncate italic">{q.project?.name}</p>
                                                    <p className="text-[9px] font-bold text-zinc-400">v{q.version} • {format(new Date(q.createdAt || ""), 'dd MMM', { locale: es })}</p>
                                                </div>
                                                <StatusBadge status={q.status} type="QUOTE" />
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-[10px] italic text-zinc-400">Sin cotizaciones generadas.</p>
                                )}
                                <Button variant="link" size="sm" className="h-auto p-0 text-[10px] font-black uppercase text-blue-600 tracking-widest mt-2" asChild>
                                    <Link href="?tab=commercial">Ir al Centro Comercial</Link>
                                </Button>
                            </div>
                        </Card>

                        <Card className="rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm hover:shadow-lg transition-all group">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-6 flex items-center gap-2">
                                <Receipt className="w-3.5 h-3.5 text-emerald-500" /> Mis Facturas
                            </h3>
                            <div className="space-y-4">
                                {invoices.length > 0 ? (
                                    <ul className="space-y-3">
                                        {invoices.slice(0, 4).map(inv => (
                                            <li key={inv.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black uppercase truncate italic">{inv.project?.name}</p>
                                                    <p className="text-[9px] font-bold text-zinc-400">${(inv.amountInvoicedGross || 0).toLocaleString()} • {format(new Date(inv.updatedAt || ""), 'dd MMM', { locale: es })}</p>
                                                </div>
                                                <StatusBadge status={inv.status} type="INVOICE" />
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-[10px] italic text-zinc-400">Sin facturas emitidas.</p>
                                )}
                                <Button variant="link" size="sm" className="h-auto p-0 text-[10px] font-black uppercase text-emerald-600 tracking-widest mt-2" asChild>
                                    <Link href="?tab=commercial">Ver todas las facturas</Link>
                                </Button>
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="commercial" className="space-y-10 focus-visible:outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Quotes Hub */}
                        <Card className="rounded-[3rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-xl">
                            <CardHeader className="px-0 pt-0 pb-8 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-black uppercase italic tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                                        <FileText className="w-6 h-6 text-blue-600" />
                                        Centro de Propuestas
                                    </CardTitle>
                                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">Historial de cotizaciones y versiones</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" className="rounded-xl h-8 text-[9px] font-black uppercase tracking-widest" asChild>
                                    <Link href="/quotes">Explorar Todas</Link>
                                </Button>
                            </CardHeader>
                            <div className="space-y-4">
                                {quotes.map(q => (
                                    <div key={q.id} className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all flex items-center justify-between group">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline" className="text-[8px] font-bold px-1.5 h-4 border-zinc-200 bg-white">v{q.version}</Badge>
                                                <h4 className="font-black text-xs uppercase tracking-tight truncate italic">{q.project?.name}</h4>
                                            </div>
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                                                Total: ${(q.totalNet || 0).toLocaleString()} • {format(new Date(q.createdAt || ""), 'dd MMM yyyy', { locale: es })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <StatusBadge status={q.status} type="QUOTE" />
                                            {q.status === 'SENT' && (
                                                <AcceptQuoteButton quoteId={q.id} />
                                            )}
                                            <Link href={`/projects/${q.projectId}/quote`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white dark:hover:bg-zinc-800 shadow-sm"><ChevronRight className="w-4 h-4" /></Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                                {quotes.length === 0 && <p className="text-center py-10 text-xs italic text-muted-foreground uppercase font-bold tracking-widest opacity-50">Sin propuestas registradas</p>}
                            </div>
                        </Card>

                        {/* Invoices Hub */}
                        <Card className="rounded-[3rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-xl">
                            <CardHeader className="px-0 pt-0 pb-8 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-black uppercase italic tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                                        <Receipt className="w-6 h-6 text-emerald-600" />
                                        Centro de Facturación
                                    </CardTitle>
                                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">Gestión de cobros y comprobantes</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" className="rounded-xl h-8 text-[9px] font-black uppercase tracking-widest" asChild>
                                    <Link href="/invoices">Ver Listado</Link>
                                </Button>
                            </CardHeader>
                            <div className="space-y-4">
                                {invoices.map(inv => (
                                    <div key={inv.id} className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all flex items-center justify-between group">
                                        <div className="min-w-0">
                                            <h4 className="font-black text-xs uppercase tracking-tight truncate italic mb-1">{inv.project?.name}</h4>
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                                                Neto: ${(inv.amountInvoicedGross || 0).toLocaleString()} • Vence: {inv.dueDate ? format(new Date(inv.dueDate), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <InvoicePdfButton invoice={inv} />
                                            <StatusBadge status={inv.status} type="INVOICE" />
                                            {/* v1.3 Requirement: CTA Pagar */}
                                            {inv.status === 'SENT' && (
                                                <Link href={`/projects/${inv.projectId}/invoices`}>
                                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase h-8 text-[9px] px-4 rounded-xl shadow-lg shadow-emerald-500/20">Pagar</Button>
                                                </Link>
                                            )}
                                            <Link href={`/projects/${inv.projectId}/invoices`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white dark:hover:bg-zinc-800 shadow-sm"><ChevronRight className="w-4 h-4" /></Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                                {invoices.length === 0 && <p className="text-center py-10 text-xs italic text-muted-foreground uppercase font-bold tracking-widest opacity-50">Sin facturas emitidas</p>}
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="team" className="focus-visible:outline-none">
                    <Card className="rounded-[3rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-10 shadow-xl">
                        <CardHeader className="px-0 pt-0 pb-8 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-black uppercase italic tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                                    <Users className="w-7 h-7 text-indigo-600" />
                                    Miembros de la Organización
                                </CardTitle>
                                <CardDescription className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1 italic">Gestión de accesos y gobernanza local.</CardDescription>
                            </div>
                            <Button variant="default" size="sm" className="rounded-xl h-10 text-[10px] font-black uppercase tracking-widest px-6 bg-zinc-900 dark:bg-white dark:text-zinc-900" asChild>
                                <Link href="/settings/team">Administrar Equipo</Link>
                            </Button>
                        </CardHeader>
                        <TeamMemberList
                            members={members}
                            currentUserId={user.id}
                            isOwner={true} // For the hub we allow owner UI if accessing
                            orgId={orgId}
                        />
                    </Card>
                </TabsContent>

                <TabsContent value="profile" className="focus-visible:outline-none">
                    <Card className="rounded-[3rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-10 shadow-xl">
                        <OrganizationProfileForm
                            organization={org as any}
                            updateAction={updateOrganizationAction as any}
                        />
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
