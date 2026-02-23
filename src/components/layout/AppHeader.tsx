'use client'

import { Search, Shield } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PaywallBanner } from "./PaywallBanner";
import { DunningBanner } from "../dashboard/DunningBanner";
import { OrgSwitcher } from "./OrgSwitcher";
import { NotificationCenter } from "./NotificationCenter";

export function AppHeader({
    profile,
    currentOrgId,
    subscription,
    paywallVariant
}: {
    profile?: { name?: string; role?: string; id?: string };
    currentOrgId?: string;
    subscription?: {
        status: "TRIALING" | "ACTIVE" | "PAUSED" | "PAST_DUE" | "CANCELED";
        trialEndsAt?: Date | null;
    };
    paywallVariant?: 'A' | 'B';
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [user, setUser] = useState<{ email?: string; id: string } | null>(null);
    const [userProfile, setUserProfile] = useState<{ name?: string; role?: string; id?: string } | undefined>(profile);

    useEffect(() => {
        async function getUser() {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                if (user) {
                    // Use maybeSingle() to prevent exceptions on 406/404
                    const { data: profileData } = await supabase
                        .from('Profile')
                        .select('*')
                        .eq('id', user.id)
                        .maybeSingle();
                    
                    if (profileData) {
                        setUserProfile(profileData);
                    }
                }
            } catch (e) {
                console.warn("[AppHeader] Non-blocking identity resolve failed:", e);
            }
        }

        // Sync if profile changes externally or not provided
        if (!profile) {
            getUser();
        }

        // Listen for profile updates
        const handleProfileUpdate = () => getUser();
        window.addEventListener('user-profile-updated', handleProfileUpdate);

        return () => window.removeEventListener('user-profile-updated', handleProfileUpdate);
    }, [profile]);

    // Close search results when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function handleSearch(query: string) {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        const supabase = createClient();

        // 1. Search Projects by Name
        const { data: projectsByName } = await supabase
            .from('Project')
            .select('id, name, client:Client(name), company:Company(name)')
            .ilike('name', `%${query}%`)
            .limit(5);

        // 2. Search Clients by Name
        const { data: foundClients } = await supabase
            .from('Client')
            .select('id')
            .ilike('name', `%${query}%`)
            .limit(5);

        let projectsByClient: any[] = [];
        if (foundClients && foundClients.length > 0) {
            const clientIds = foundClients.map(c => c.id);
            const { data } = await supabase
                .from('Project')
                .select('id, name, client:Client(name), company:Company(name)')
                .in('clientId', clientIds)
                .limit(5);
            projectsByClient = data || [];
        }

        // Combine and Deduplicate
        const allProjects = [...(projectsByName || []), ...projectsByClient];

        // Deduplicate by ID
        const uniqueProjects = Array.from(new Map(allProjects.map(item => [item.id, item])).values());

        if (uniqueProjects.length > 0) {
            setSearchResults(uniqueProjects);
            setShowResults(true);
        } else {
            setSearchResults([]);
            setShowResults(true); // Show "No results"
        }
    }


    const rawName = userProfile?.name || user?.email || 'Usuario';
    const displayedName = rawName
        .replace(/testUSER/i, 'Test')
        .replace(/\s*User$/i, '')
        .replace(/^\s*User\s*/i, '')
        .replace(/\s*USER$/i, '')
        .trim();

    return (
        <>
            <DunningBanner subscription={subscription} />
            {subscription && (
                <PaywallBanner
                    status={subscription.status}
                    trialEndsAt={subscription.trialEndsAt}
                    variant={paywallVariant}
                />
            )}
            <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40 transition-colors flex items-center justify-between px-6 print:hidden">
                <div className="flex items-center flex-1 gap-4">
                    {/* Breadcrumbs for easier navigation */}
                    <div className="hidden md:block">
                        <Breadcrumbs />
                    </div>            {/* ... search ... */}
                    <div className="flex items-center w-1/3" ref={searchRef}>
                        {/* DEBUG MARKER */}

                        <div className="relative w-full max-w-md hidden md:block">
                            {/* ... existing search code ... */}
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Buscar proyectos o clientes..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                onFocus={() => { if (searchQuery.length >= 2) setShowResults(true) }}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-full focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all shadow-sm hover:border-zinc-400"
                            />
                            {showResults && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    {searchResults.length > 0 ? (
                                        <ul className="py-1">
                                            {searchResults.map((project) => (
                                                <li key={project.id}>
                                                    <button
                                                        onClick={() => {
                                                            router.push(`/projects/${project.id}`);
                                                            setShowResults(false);
                                                            setSearchQuery("");
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex flex-col"
                                                    >
                                                        <span className="font-medium text-sm text-foreground">{project.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {(project.client && project.client.name) || (project.company && project.company.name) || 'Sin cliente asignado'}
                                                        </span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                            No se encontraron resultados.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm" data-testid="user-identity-chip">
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                            {displayedName.substring(0, 2)}
                        </div>
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 max-w-[120px] truncate">
                            {displayedName}
                        </span>
                        {userProfile?.role === 'SUPERADMIN' && (
                            <span 
                                className="text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter border border-blue-200/50 dark:border-blue-800/50 shadow-sm"
                                data-testid="user-role-badge"
                            >
                                SuperAdmin
                            </span>
                        )}
                    </div>

                    {userProfile?.role === 'SUPERADMIN' && currentOrgId && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg shadow-sm animate-in zoom-in duration-300" data-testid="superadmin-local-mode-badge">
                            <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Modo Local</span>
                        </div>
                    )}

                    {userProfile?.role === 'SUPERADMIN' && (
                        <Link
                            href="/admin"
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-primary transition-colors flex items-center gap-2"
                            title={currentOrgId ? "Volver al Cockpit Global" : "Ir al Cockpit Global"}
                            data-testid="back-to-cockpit-button"
                        >
                            <Shield className="w-5 h-5 text-blue-600" />
                            <span className="text-xs font-bold uppercase tracking-wider hidden lg:inline text-blue-600">
                                {currentOrgId ? 'Cockpit' : 'Panel Global'}
                            </span>
                        </Link>
                    )}
                    <OrgSwitcher currentOrgId={currentOrgId} />
                    <ThemeToggle />
                    <NotificationCenter
                        organizationId={currentOrgId}
                        userRole={(userProfile?.role as string) || 'MEMBER'}
                    />
                </div>
            </header>
        </>
    );
}
