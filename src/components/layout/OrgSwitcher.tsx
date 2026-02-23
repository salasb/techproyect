'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Check, Building2, PlusCircle, CreditCard, Clock, Lock, Shield } from 'lucide-react';
import { getUserOrganizations, switchOrganizationAction } from '@/actions/organizations';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function OrgSwitcher({ currentOrgId }: { currentOrgId?: string }) {
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function loadOrgs() {
            try {
                const data = await getUserOrganizations();
                setOrganizations(data);
            } catch (error) {
                console.error('Error loading orgs:', error);
            } finally {
                setLoading(false);
            }
        }
        loadOrgs();
    }, []);

    const currentOrg = organizations.find(o => o.id === currentOrgId);

    const handleSwitch = async (id: string) => {
        if (id === currentOrgId) return;
        setLoading(true);
        await switchOrganizationAction(id);
        // Page will refresh due to redirect in action
    };

    if (loading && !currentOrg) {
        return <div className="h-9 w-48 bg-muted animate-pulse rounded-md" />;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild data-testid="context-selector-trigger">
                <Button variant="ghost" className="h-auto py-2 px-3 group flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-800 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm ring-1 ring-white/20">
                            <Building2 className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col items-start leading-none gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest" data-testid="context-active-label">
                                {currentOrg ? 'Organización Activa' : 'Seleccionar Contexto'}
                            </span>
                            <span className="text-sm font-black truncate max-w-[130px] text-slate-900 dark:text-slate-100">
                                {currentOrg?.name || 'Ninguna'}
                            </span>
                            {currentOrg?.subscription && (
                                <div className="flex items-center gap-1.5">
                                    <div className={cn(
                                        "h-1.5 w-1.5 rounded-full",
                                        currentOrg.subscription.status === 'ACTIVE' ? "bg-green-500 animate-pulse" :
                                            currentOrg.subscription.status === 'TRIALING' ? "bg-amber-500" : "bg-rose-500"
                                    )} />
                                    <span className={cn(
                                        "text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-sm",
                                        currentOrg.subscription.status === 'TRIALING' ? "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                                            currentOrg.subscription.status === 'ACTIVE' ? "bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300" :
                                                "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                                    )}>
                                        {currentOrg.subscription.status === 'TRIALING' ? 'TRIAL' :
                                            currentOrg.subscription.status === 'ACTIVE' ? 'PRO' : 'PAUSED'}
                                    </span>
                                    {currentOrg.OrganizationMember?.[0]?.role && (
                                        <Badge variant="outline" className="text-[9px] px-1 h-3.5 border-slate-200 dark:border-slate-800 text-slate-500">
                                            {currentOrg.OrganizationMember[0].role}
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400 ml-1 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" data-testid="org-switcher-content" className="w-72 p-2 shadow-2xl border-slate-200 dark:border-slate-800">
                <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    Tus Organizaciones
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {organizations.length === 0 ? (
                        <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                            No tienes organizaciones activas.<br />
                            <span className="text-xs">Crea o únete a una para comenzar.</span>
                        </div>
                    ) : organizations.map((org) => (
                        <DropdownMenuItem
                            key={org.id}
                            data-testid={`org-item-${org.name}`}
                            className={cn(
                                "flex items-center justify-between px-3 py-2.5 cursor-pointer rounded-lg transition-colors",
                                org.id === currentOrgId ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            )}
                            onSelect={() => handleSwitch(org.id)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "h-8 w-8 rounded-md flex items-center justify-center transition-colors",
                                    org.id === currentOrgId ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                )}>
                                    <Building2 className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("text-sm transition-all", org.id === currentOrgId ? "font-bold text-blue-700 dark:text-blue-400 scale-[1.02]" : "font-medium text-slate-700 dark:text-slate-300")}>
                                            {org.name}
                                        </span>
                                        {org.OrganizationMember?.[0]?.role && (
                                            <span className="text-[9px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase tracking-tighter">
                                                {org.OrganizationMember[0].role}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {org.subscription?.status === 'ACTIVE' ? 'Suscripción Activa' :
                                            org.subscription?.status === 'TRIALING' ? 'Período de Prueba' : 'Cuenta Pausada'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {org.id === currentOrgId ? (
                                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                ) : (
                                    <div className="flex items-center">
                                        {org.subscription?.status === 'TRIALING' && <Clock className="h-3.5 w-3.5 text-amber-500/80" />}
                                        {org.subscription?.status === 'ACTIVE' && <div className="h-2 w-2 rounded-full bg-green-500/80" />}
                                        {org.subscription?.status === 'PAUSED' && <Lock className="h-3.5 w-3.5 text-rose-500/80" />}
                                    </div>
                                )}
                            </div>
                        </DropdownMenuItem>
                    ))}
                </div>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem asChild className="p-0">
                    <Link 
                        href="/start" 
                        data-testid="new-org-link"
                        className="w-full flex items-center gap-3 px-3 py-3 text-blue-600 dark:text-blue-400 font-bold text-sm hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg transition-all group"
                    >
                        <div className="h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <PlusCircle className="h-4 w-4" />
                        </div>
                        <span>Nueva Organización</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="p-0">
                    <Link 
                        href="/admin" 
                        data-testid="go-cockpit-link"
                        className="w-full flex items-center gap-3 px-3 py-3 text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-lg transition-all group border-t border-slate-100 dark:border-slate-800 mt-1"
                    >
                        <div className="h-8 w-8 rounded-md bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Shield className="h-4 w-4" />
                        </div>
                        <span>Ir al Cockpit Global</span>
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu >
    );
}
