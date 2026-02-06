'use client'

import { Bell, Search, User, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AppHeader() {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        async function getUser() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const { data: profile } = await supabase
                    .from('Profile')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setUserProfile(profile);
            }
        }
        getUser();
    }, []);

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

    return (
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40 transition-colors flex items-center justify-between px-6 print:hidden">
            <div className="flex items-center w-1/3" ref={searchRef}>
                <div className="relative w-full max-w-md hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Buscar proyectos o clientes..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onFocus={() => { if (searchQuery.length >= 2) setShowResults(true) }}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-900 border-none rounded-full focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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

            <div className="flex items-center space-x-4">
                <ThemeToggle />
                <div className="relative group">
                    <button className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors relative">
                        <Bell className="w-5 h-5" />
                        {/* Only show if we had real notifications logic. For now, removed static red dot per user request. */}
                        {/* <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-zinc-950"></span> */}
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-card border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                        <p className="text-sm text-center text-muted-foreground">Sin notificaciones nuevas</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3 pl-4 border-l border-zinc-200 dark:border-zinc-800">
                    <div className="flex flex-col text-right hidden sm:block">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{userProfile?.name || user?.email || 'Usuario'}</span>
                        <span className="text-xs text-zinc-500">{userProfile?.role || 'User'}</span>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                        <User className="w-5 h-5" />
                    </div>
                </div>
            </div>
        </header>
    );
}
