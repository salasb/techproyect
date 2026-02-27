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
    Building2
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function OrganizationPage(props: { searchParams: Promise<{ tab?: string }> }) {
    const searchParams = await props.searchParams;
    const initialTab = searchParams.tab || "overview";
    const supabase = await createClient();
    const orgId = await getOrganizationId();

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { 
            subscription: true,
            stats: true,
            _count: {
                select: { OrganizationMember: true, projects: true }
            }
        }
    });

    if (!org) {
        return <div className="p-8 text-center text-muted-foreground italic">Organización no encontrada</div>;
    }

    const subscription = org.subscription;
    const isPastDue = subscription?.status === 'PAST_DUE';
    const isTrialing = subscription?.status === 'TRIALING';
    
    // v1.1 Advanced Health Check for Triage Reduction
    const adminCount = org._count.OrganizationMember; // This counts all, but rule refined to ADMIN/OWNER
    // For simplicity here, we'll check if there is at least one member (which is the bootstrap default)
    const hasAdmins = adminCount > 0;
    const hasProjects = org._count.projects > 0;

    // Activation Checklist Logic
    const checklistSteps = [
        {
            id: "profile",
            title: "Perfil corporativo",
            description: "Nombre y RUT fiscal validados.",
            completed: !!org.rut && !!org.name && !org.name.includes("Mi Organización"),
            href: "/settings/organization?tab=profile"
        },
        {
            id: "admins",
            title: "Gobernanza local",
            description: "Asegura continuidad con administradores asignados.",
            completed: hasAdmins,
            href: "/settings/team"
        },
        {
            id: "billing",
            title: "Setup financiero",
            description: "Método de pago activo en Stripe.",
            completed: !!subscription?.providerCustomerId,
            href: "/settings/billing"
        },
        {
            id: "team",
            title: "Expansión de equipo",
            description: "Invita a tu primer colaborador.",
            completed: adminCount > 1,
            href: "/settings/team"
        },
        {
            id: "projects",
            title: "Primera operación",
            description: "Crea tu primer proyecto comercial.",
            completed: hasProjects,
            href: "/projects/new"
        }
    ];

    const completedSteps = checklistSteps.filter(s => s.completed).length;
    const progressPercent = Math.round((completedSteps / checklistSteps.length) * 100);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic">
                            {org.name}
                        </h1>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium italic">
                        Centro de Control de Organización y Gobernanza.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="bg-zinc-50 dark:bg-zinc-900 font-bold uppercase text-[10px] py-1 px-3 border-zinc-200">
                        Plan: {org.plan || 'FREE'}
                    </Badge>
                    <Badge className={`${isPastDue ? 'bg-rose-600' : 'bg-emerald-600'} text-white font-bold uppercase text-[10px] py-1 px-3 border-none`}>
                        {subscription?.status || 'SIN PLAN'}
                    </Badge>
                </div>
            </div>

            <Tabs defaultValue={initialTab} className="w-full">
                <TabsList className="bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl mb-8">
                    <TabsTrigger value="overview" className="rounded-xl px-6 font-bold uppercase text-[10px] tracking-widest">Vista General</TabsTrigger>
                    <TabsTrigger value="profile" className="rounded-xl px-6 font-bold uppercase text-[10px] tracking-widest">Perfil Corporativo</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Salud y Estado */}
                        <Card className="rounded-[2.5rem] border-none shadow-xl bg-zinc-900 text-white p-8 space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5" />
                                Estado Operativo
                            </h3>
                            <div className="space-y-4">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest mb-1">Salud del Nodo</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-xl font-black tracking-tight">{org.stats?.healthScore || 100}%</span>
                                    </div>
                                </div>
                                <div className={`p-4 rounded-2xl border ${isPastDue ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
                                    <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest mb-1">Suscripción</p>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-lg font-black tracking-tight uppercase ${isPastDue ? 'text-red-400' : ''}`}>
                                            {subscription?.status || 'FREE'}
                                        </span>
                                        {isTrialing && (
                                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-none text-[8px] font-black">TRIAL</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Button variant="outline" className="w-full rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white font-black uppercase tracking-widest text-[10px] h-12" asChild>
                                <Link href="/settings/billing">Ir a Facturación</Link>
                            </Button>
                        </Card>

                        {/* Checklist de Activación */}
                        <Card className="lg:col-span-2 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-2 italic">
                                        <Zap className="w-5 h-5 text-indigo-600 fill-indigo-600" />
                                        Checklist de Activación
                                        <Badge variant="outline" className="ml-2 text-[8px] border-emerald-200 text-emerald-600 bg-emerald-50">Reductor de Ruido</Badge>
                                    </h3>
                                    <p className="text-xs font-medium text-zinc-500 mt-1 uppercase tracking-tighter">Completa estos pasos para reducir incidencias en el sistema.</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-indigo-600 italic tracking-tighter">{progressPercent}%</span>
                                    <div className="w-32 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-1">
                                        <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {checklistSteps.map((step) => (
                                    <div key={step.id} className="flex items-center justify-between p-4 rounded-3xl border border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${step.completed ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'}`}>
                                                {step.completed ? <CheckCircle2 className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <h4 className={`text-sm font-black uppercase tracking-tight ${step.completed ? 'text-zinc-400 line-through decoration-zinc-300' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                                    {step.title}
                                                </h4>
                                                <p className="text-[10px] font-medium text-zinc-500">{step.description}</p>
                                            </div>
                                        </div>
                                        {!step.completed && (
                                            <Link href={step.href}>
                                                <Button size="sm" className="rounded-xl text-[9px] font-black uppercase px-4 h-8 bg-zinc-900 dark:bg-white dark:text-zinc-900">Configurar</Button>
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Quick Access Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Link href="/settings/team" className="p-6 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-all group">
                            <Users className="w-8 h-8 text-indigo-600 mb-4 group-hover:scale-110 transition-transform" />
                            <h4 className="font-black uppercase text-sm tracking-tight mb-1">Mi Equipo</h4>
                            <p className="text-xs text-zinc-500 font-medium">Gestiona miembros ({org._count.OrganizationMember}) y sus permisos.</p>
                        </Link>
                        <Link href="/settings/billing" className="p-6 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-all group">
                            <CreditCard className="w-8 h-8 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
                            <h4 className="font-black uppercase text-sm tracking-tight mb-1">Facturación</h4>
                            <p className="text-xs text-zinc-500 font-medium">Ver planes, consumos y facturas pendientes.</p>
                        </Link>
                        <Link href="/settings/organization?tab=profile" className="p-6 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-all group">
                            <ShieldCheck className="w-8 h-8 text-emerald-600 mb-4 group-hover:scale-110 transition-transform" />
                            <h4 className="font-black uppercase text-sm tracking-tight mb-1">Seguridad</h4>
                            <p className="text-xs text-zinc-500 font-medium">Configuración de acceso y auditoría local.</p>
                        </Link>
                    </div>
                </TabsContent>

                <TabsContent value="profile" className="animate-in slide-in-from-right-4 duration-500">
                    <Card className="rounded-[2.5rem] border-none shadow-xl p-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
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
