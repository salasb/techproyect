"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, X, AlertCircle, AlertTriangle, Info, CheckCircle2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    severity: string;
    status: string;
    createdAt: string;
    metadata: any;
}

export function NotificationCenter({ organizationId }: { organizationId?: string }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const fetchNotifications = async () => {
        if (!organizationId) return;
        const supabase = createClient();
        const { data } = await supabase
            .from('SentinelAlert')
            .select('*')
            .eq('organizationId', organizationId)
            .order('createdAt', { ascending: false })
            .limit(10);

        if (data) {
            setNotifications(data as any);
            setUnreadCount(data.filter(n => n.status === 'OPEN').length);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Polling for updates (could be optimized with Realtime)
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [organizationId]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAsResolved = async (id: string) => {
        const supabase = createClient();
        await supabase
            .from('SentinelAlert')
            .update({ status: 'RESOLVED' })
            .eq('id', id);

        // Update local state
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'RESOLVED' } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'S0': return <AlertCircle className="w-4 h-4 text-red-600" />;
            case 'S1': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
            case 'S2': return <Info className="w-4 h-4 text-blue-600" />;
            default: return <CheckCircle2 className="w-4 h-4 text-zinc-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors group"
            >
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-primary' : ''} group-hover:scale-110 transition-transform`} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-[10px] font-bold text-white rounded-full border-2 border-white dark:border-zinc-950 flex items-center justify-center animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-border bg-zinc-50/50 flex items-center justify-between">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Notificaciones</h4>
                        {unreadCount > 0 && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">
                                {unreadCount} Nuevas
                            </span>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
                        {notifications.length > 0 ? (
                            notifications.map((n) => (
                                <div key={n.id} className={`p-4 hover:bg-zinc-50 transition-colors ${n.status === 'OPEN' ? 'bg-primary/[0.02]' : ''}`}>
                                    <div className="flex gap-3">
                                        <div className="mt-0.5">
                                            {getSeverityIcon(n.severity)}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-zinc-400 capitalize">
                                                    {n.type.replace('_', ' ')}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: es })}
                                                </span>
                                            </div>
                                            <h5 className="text-xs font-bold text-foreground leading-tight">{n.title}</h5>
                                            <p className="text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>

                                            <div className="flex items-center justify-between mt-3">
                                                {n.metadata?.projectId && (
                                                    <button
                                                        onClick={() => {
                                                            router.push(`/projects/${n.metadata.projectId}`);
                                                            setIsOpen(false);
                                                        }}
                                                        className="text-[10px] font-bold text-primary hover:underline flex items-center"
                                                    >
                                                        Ver <ArrowRight className="w-3 h-3 ml-1" />
                                                    </button>
                                                )}
                                                {n.status === 'OPEN' && (
                                                    <button
                                                        onClick={() => markAsResolved(n.id)}
                                                        className="ml-auto p-1 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                                                        title="Resolver"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center space-y-2">
                                <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center mx-auto">
                                    <Info className="w-5 h-5 text-zinc-300" />
                                </div>
                                <p className="text-xs text-muted-foreground">No tienes notificaciones pendientes.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-border bg-zinc-50/30">
                        <Link
                            href="/dashboard"
                            onClick={() => setIsOpen(false)}
                            className="text-[10px] font-bold text-center block text-zinc-500 hover:text-primary uppercase tracking-widest"
                        >
                            Ver Todo en Command Center
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
