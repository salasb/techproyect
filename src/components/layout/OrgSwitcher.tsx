'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Check, Building2, PlusCircle, CreditCard, Clock, Lock } from 'lucide-react';
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
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 px-3 flex items-center gap-2 hover:bg-muted/50 transition-all border border-transparent hover:border-border">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Building2 className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col items-start leading-none gap-0.5">
                            <span className="text-sm font-bold truncate max-w-[120px]">
                                {currentOrg?.name || 'Seleccionar Org'}
                            </span>
                            {currentOrg?.subscription && (
                                <div className="flex items-center gap-1">
                                    <span className={cn(
                                        "text-[9px] font-bold uppercase tracking-tight px-1 rounded",
                                        currentOrg.subscription.status === 'TRIALING' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                            currentOrg.subscription.status === 'ACTIVE' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                    )}>
                                        {currentOrg.subscription.status === 'TRIALING' ? 'TRIAL' :
                                            currentOrg.subscription.status === 'ACTIVE' ? 'PRO' : 'PAUSED'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tus Organizaciones
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {organizations.map((org) => (
                    <DropdownMenuItem
                        key={org.id}
                        className="flex items-center justify-between py-2 cursor-pointer"
                        onSelect={() => handleSwitch(org.id)}
                    >
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "h-2 w-2 rounded-full",
                                org.id === currentOrgId ? "bg-blue-500" : "bg-transparent"
                            )} />
                            <span className={cn("text-sm", org.id === currentOrgId ? "font-bold" : "font-medium")}>
                                {org.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {org.subscription?.status === 'TRIALING' && <Clock className="h-3 w-3 text-amber-500" />}
                            {org.subscription?.status === 'ACTIVE' && <Check className="h-3 w-3 text-green-500" />}
                            {org.subscription?.status === 'PAUSED' && <Lock className="h-3 w-3 text-rose-500" />}
                        </div>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/start" className="flex items-center gap-2 text-blue-600 font-medium py-2 cursor-pointer focus:text-blue-700">
                        <PlusCircle className="h-4 w-4" />
                        <span>Nueva Organización</span>
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
