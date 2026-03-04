import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus, ArrowRight, Shield, BadgeCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { switchOrganizationAction } from "@/actions/organizations";

export const dynamic = 'force-dynamic';

export default async function OrganizationsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const memberships = await prisma.organizationMember.findMany({
        where: { userId: user.id, status: 'ACTIVE' },
        include: {
            organization: {
                include: {
                    subscription: true
                }
            }
        }
    });

    const orgs = memberships.map(m => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
        plan: m.organization.plan || 'FREE',
        status: m.organization.subscription?.status || 'ACTIVE',
        trialEndsAt: m.organization.subscription?.trialEndsAt
    }));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 font-sans">
            <div className="max-w-5xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-600 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Gestión Global</span>
                        </div>
                        <h1 className="text-5xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">Mis Organizaciones</h1>
                        <p className="text-slate-500 font-medium italic">Selecciona un espacio de trabajo para comenzar a operar.</p>
                    </div>
                    <Link href="/organizations/new">
                        <Button className="h-14 px-8 bg-blue-600 rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-blue-900/20 group">
                            <Plus className="w-5 h-5 mr-2 transition-transform group-hover:rotate-90" />
                            Nueva Organización
                        </Button>
                    </Link>
                </div>

                {/* Orgs Grid */}
                {orgs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {orgs.map((org) => (
                            <Card key={org.id} className="group rounded-[2.5rem] border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-2xl hover:border-blue-200 transition-all duration-500 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-6">
                                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-slate-50 border-slate-100 text-slate-400">
                                        {org.role}
                                    </Badge>
                                </div>
                                
                                <CardHeader className="p-8 pb-4">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-zinc-800 rounded-3xl border border-slate-100 dark:border-zinc-700 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-inner">
                                        <Building2 className="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                    </div>
                                    <CardTitle className="text-xl font-black uppercase italic tracking-tight truncate">{org.name}</CardTitle>
                                </CardHeader>
                                
                                <CardContent className="p-8 pt-0 space-y-6">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <span>Plan {org.plan}</span>
                                        <span className={cn(
                                            "flex items-center gap-1.5",
                                            org.status === 'ACTIVE' || org.status === 'TRIALING' ? "text-emerald-500" : "text-rose-500"
                                        )}>
                                            <div className={cn("w-1.5 h-1.5 rounded-full", org.status === 'ACTIVE' || org.status === 'TRIALING' ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                                            {org.status}
                                        </span>
                                    </div>

                                    <form action={async () => {
                                        'use server';
                                        await switchOrganizationAction(org.id);
                                    }}>
                                        <Button 
                                            type="submit"
                                            className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-zinc-800 hover:bg-blue-600 text-white font-black uppercase italic text-xs tracking-[0.2em] transition-all group/btn"
                                        >
                                            Entrar <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-zinc-800 p-20 text-center space-y-6">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 className="w-10 h-10 text-slate-300" />
                        </div>
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase">No tienes organizaciones</h2>
                        <p className="text-slate-500 text-sm font-medium italic max-w-sm mx-auto leading-relaxed">
                            Para comenzar a gestionar tus proyectos e inventario, necesitas crear tu primer espacio de trabajo.
                        </p>
                        <Link href="/organizations/new" className="inline-block">
                            <Button className="h-14 px-10 bg-blue-600 rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-blue-900/20">
                                Crear mi primera empresa
                            </Button>
                        </Link>
                    </div>
                )}

                {/* Footer Info */}
                <div className="pt-12 border-t border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <BadgeCheck className="w-5 h-5 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Seguridad Aislada por Organización</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/dashboard" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">Volver al App</Link>
                        <Link href="/api/auth/logout" className="text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-600 transition-colors">Cerrar Sesión</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
