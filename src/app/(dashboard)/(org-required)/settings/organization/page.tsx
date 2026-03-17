import React from "react";
import { OrganizationProfileForm } from "@/components/settings/OrganizationProfileForm";
import { updateOrganizationAction } from "@/actions/organizations";
import { 
    Activity, 
    ShieldCheck, 
    CheckCircle2, 
    ChevronRight,
    Building2,
    FileText,
    Receipt,
    History,
    AlertCircle,
    Users,
    Zap
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TeamMemberList } from "@/components/team/member-list";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InvoicePdfButton } from "@/components/invoices/InvoicePdfButton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { redirect } from "next/navigation";
import { resolveAccessContext } from "@/lib/auth/access-resolver";
import { SettingsCoreService } from "@/services/settings-core-service";

export default async function OrganizationHubPage(props: { searchParams: Promise<{ tab?: string }> }) {
    let context;
    try {
        context = await resolveAccessContext();
    } catch (e) {
        redirect("/login");
    }

    const { traceId, activeOrgId } = context;
    const searchParams = await props.searchParams;
    const initialTab = searchParams.tab || "overview";

    if (!activeOrgId) {
        return (
            <div className="p-12 text-center bg-muted/20 rounded-xl border-2 border-dashed border-border m-8">
                <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
                <h3 className="text-lg font-bold">Gestión de Organización</h3>
                <p className="text-muted-foreground">Debes seleccionar una organización activa para ver el dashboard corporativo.</p>
                <div className="mt-4 p-2 bg-white/50 rounded font-mono text-[10px] opacity-60">Trace: {traceId}</div>
            </div>
        );
    }

    try {
        console.log(`[Settings][OrgHub][${traceId}] Loading hub for org=${activeOrgId}`);

        const data = await SettingsCoreService.getOrganizationData(context);
        const { org, quotes, invoices } = data;

        const subscription = org.subscription;
        const isPastDue = subscription?.status === 'PAST_DUE';
        
        const members = org.OrganizationMember;
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
                description: "Administra miembros y roles.",
                completed: members.length > 0,
                href: "?tab=team"
            },
            {
                id: "billing",
                title: "Setup Financiero",
                description: "Método de pago vinculado.",
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
                            <TabsTrigger value="overview" className="rounded-[1.5rem] px-8 py-2.5 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-800 transition-all gap-2 text-zinc-600 dark:text-zinc-400 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white">
                                <Zap className="w-3.5 h-3.5 mr-2" /> Dashboard
                            </TabsTrigger>
                            <TabsTrigger value="commercial" className="rounded-[1.5rem] px-8 py-2.5 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-800 transition-all gap-2 text-zinc-600 dark:text-zinc-400 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white">
                                <FileText className="w-3.5 h-3.5 mr-2" /> Comercial
                            </TabsTrigger>
                            <TabsTrigger value="team" className="rounded-[1.5rem] px-8 py-2.5 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-800 transition-all gap-2 text-zinc-600 dark:text-zinc-400 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white">
                                <Users className="w-3.5 h-3.5 mr-2" /> Miembros
                            </TabsTrigger>
                            <TabsTrigger value="profile" className="rounded-[1.5rem] px-8 py-2.5 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-800 transition-all gap-2 text-zinc-600 dark:text-zinc-400 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white">
                                <Building2 className="w-3.5 h-3.5 mr-2" /> Perfil
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="overview" className="space-y-10 focus-visible:outline-none">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <Card className="lg:col-span-2 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-8">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-1 italic">Estado de Onboarding</h3>
                                        <p className="text-2xl font-black italic uppercase tracking-tighter">Preparación Operativa</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-4xl font-black italic text-indigo-600">{progressPercent}%</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {checklistSteps.map(step => (
                                        <Link href={step.href} key={step.id}>
                                            <div className={cn(
                                                "p-4 rounded-2xl border transition-all flex items-center gap-4",
                                                step.completed 
                                                    ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" 
                                                    : "bg-zinc-100/50 dark:bg-zinc-800/30 border-dashed border-zinc-300 dark:border-zinc-700 opacity-60 hover:opacity-100"
                                            )}>
                                                <div className={cn(
                                                    "p-2 rounded-xl",
                                                    step.completed ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400"
                                                )}>
                                                    {step.completed ? <CheckCircle2 className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black uppercase tracking-tight">{step.title}</p>
                                                    <p className="text-[9px] font-bold text-zinc-400 truncate">{step.description}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </Card>

                            <Card className="rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-xl">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2 italic">
                                    <History className="w-3.5 h-3.5" /> Últimas Facturas
                                </h3>
                                <div className="space-y-4">
                                    {invoices.length > 0 ? (
                                        <ul className="space-y-3">
                                            {invoices.slice(0, 4).map(inv => (
                                                <li key={inv.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black uppercase truncate italic">{inv.project?.name || "Proyecto"}</p>
                                                        <p className="text-[9px] font-bold text-zinc-400">${(inv.amountInvoicedGross || 0).toLocaleString()} • {format(new Date(inv.updatedAt || ""), 'dd MMM', { locale: es })}</p>
                                                    </div>
                                                    <StatusBadge status={inv.status as any} type="INVOICE" />
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
                            <Card className="rounded-[3rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-xl">
                                <CardHeader className="px-0 pt-0 pb-8 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-black uppercase italic tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                                            <FileText className="w-6 h-6 text-blue-600" />
                                            Centro de Propuestas
                                        </CardTitle>
                                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">Historial de cotizaciones y versiones</CardDescription>
                                    </div>
                                </CardHeader>
                                <div className="space-y-4">
                                    {quotes.map(q => (
                                        <div key={q.id} className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all flex items-center justify-between group">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className="text-[8px] font-bold px-1.5 h-4 border-zinc-200 bg-white">v{q.version}</Badge>
                                                    <h4 className="font-black text-xs uppercase tracking-tight truncate italic">{q.project?.name || "Proyecto"}</h4>
                                                </div>
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                                                    Total: ${(q.totalNet || 0).toLocaleString()} • {format(new Date(q.createdAt || ""), 'dd MMM yyyy', { locale: es })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <StatusBadge status={q.status as any} type="QUOTE" />
                                                <Link href={`/projects/${q.projectId}/quote`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white dark:hover:bg-zinc-800 shadow-sm"><ChevronRight className="w-4 h-4" /></Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                    {quotes.length === 0 && <p className="text-center py-10 text-xs italic text-muted-foreground uppercase font-bold tracking-widest opacity-50">Sin propuestas registradas</p>}
                                </div>
                            </Card>

                            <Card className="rounded-[3rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-xl">
                                <CardHeader className="px-0 pt-0 pb-8 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-black uppercase italic tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                                            <Receipt className="w-6 h-6 text-emerald-600" />
                                            Centro de Facturación
                                        </CardTitle>
                                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">Gestión de cobros y comprobantes</CardDescription>
                                    </div>
                                </CardHeader>
                                <div className="space-y-4">
                                    {invoices.map(inv => (
                                        <div key={inv.id} className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all flex items-center justify-between group">
                                            <div className="min-w-0">
                                                <h4 className="font-black text-xs uppercase tracking-tight truncate italic mb-1">{inv.project?.name || "Proyecto"}</h4>
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                                                    Neto: ${(inv.amountInvoicedGross || 0).toLocaleString()} • Vence: {inv.dueDate ? format(new Date(inv.dueDate), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <InvoicePdfButton invoice={inv as any} />
                                                <StatusBadge 
                                                    status={inv.status === 'PAID' ? 'PAID' : inv.sent ? 'SENT' : inv.status as any} 
                                                    type="INVOICE" 
                                                />
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
                                members={members as any}
                                currentUserId={context.userId}
                                isOwner={context.localMembershipRole === 'OWNER'} 
                                orgId={activeOrgId}
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
    } catch (error: any) {
        console.error(`[Settings][OrgHub][${traceId}] Critical failure:`, error.message);
        
        const isNotFound = error.message === 'NOT_FOUND';
        
        return (
            <div className="p-12 text-center bg-rose-50 border-2 border-rose-200 rounded-xl m-8 text-rose-900">
                <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-4" />
                <h3 className="text-lg font-bold uppercase tracking-tight">
                    {isNotFound ? "Organización no Encontrada" : "Error de Infraestructura Organizacional"}
                </h3>
                <p className="max-w-md mx-auto mt-2">
                    {isNotFound 
                        ? "La organización solicitada no existe o ha sido eliminada."
                        : "Hubo un error al cargar la configuración de la organización. Por favor reintenta en unos momentos."}
                </p>
                <div className="mt-4 p-2 bg-white/50 rounded font-mono text-[10px] opacity-60">Trace: {traceId}</div>
            </div>
        );
    }
}
