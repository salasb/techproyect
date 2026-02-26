"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bell, Info, AlertTriangle, ShieldAlert, Check, ExternalLink, Loader2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markNotificationRead, getCockpitV2Data, resolveCockpitAlert } from "@/app/actions/superadmin-v2";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { toast } from "sonner";
import type { OperationalActionResult } from "@/lib/superadmin/cockpit-data-adapter";

import { useSearchParams } from "next/navigation";

interface NotificationItem {
    id: string;
    title: string;
    body: string;
    createdAt: string;
    metadata?: { 
        severity?: string;
        href?: string;
        ruleCode?: string;
        fingerprint?: string;
    };
    alert?: {
        organization?: {
            name: string;
        }
    };
}

export function SuperadminNotificationCenter() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [actingId, setActingId] = useState<string | null>(null);
    const searchParams = useSearchParams();

    const scopeMode = searchParams.get('scopeMode') || "production_only";
    const includeNonProductive = searchParams.get('includeNonProductive') === '1';
    const isDiagnosticMode = scopeMode === 'all';

    const loadData = useCallback(async (isMountedRef: { current: boolean }, skipLoadingState = false) => {
        if (isMountedRef.current && !skipLoadingState) setLoading(true);
        const res = await getCockpitV2Data({ scopeMode, includeNonProductive });
        if (isMountedRef.current && res.ok && res.data) {
            const payload = res.data as { notifications: NotificationItem[] };
            setNotifications(payload.notifications || []);
        }
        if (isMountedRef.current) setLoading(false);
    }, [scopeMode, includeNonProductive]);

    useEffect(() => {
        const isMounted = { current: true };
        loadData(isMounted, true);
        return () => { isMounted.current = false; };
    }, [loadData]);

    const handleMarkRead = async (id: string) => {
        try {
            const res = await markNotificationRead(id);
            if (res.ok) {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch (_error) {
            console.error("Failed to mark notification as read");
        }
    };

    const handleOperationalAction = async (notifId: string, fingerprint: string, actionFn: (fp: string) => Promise<OperationalActionResult<unknown>>) => {
        setActingId(notifId);
        try {
            const res = await actionFn(fingerprint);
            if (res.ok) {
                toast.success("Acción completada", { description: res.message });
                // Also mark as read automatically when acted upon
                await markNotificationRead(notifId);
                setNotifications(prev => prev.filter(n => n.id !== notifId));
            } else {
                toast.error("Error", { description: res.message });
            }
        } catch {
            toast.error("Fallo técnico al procesar acción");
        } finally {
            setActingId(null);
        }
    };

    const unreadCount = notifications.length;

    const getIcon = (metadata: { severity?: string } | undefined) => {
        const severity = metadata?.severity || "INFO";
        if (severity === "CRITICAL" || severity === "critical") return <ShieldAlert className="w-4 h-4 text-red-500" />;
        if (severity === "WARNING" || severity === "warning") return <AlertTriangle className="w-4 h-4 text-amber-500" />;
        return <Info className="w-4 h-4 text-blue-500" />;
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-white/10 transition-colors">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-[9px] bg-red-600 hover:bg-red-700 border-none animate-in zoom-in duration-300">
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
                    <div className="flex flex-col">
                        <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                            <Activity className="w-3 h-3 text-blue-500" />
                            {isDiagnosticMode ? "Notificaciones (diagnóstico)" : "Notificaciones"}
                        </h3>
                        {isDiagnosticMode && (
                            <span className="text-[7px] font-bold text-amber-600 uppercase mt-0.5">No afecta KPIs operacionales</span>
                        )}
                    </div>
                    {unreadCount === 0 && <span className="text-[10px] font-bold text-muted-foreground">Al día</span>}
                </div>

                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-10 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
                            Sincronizando Engine...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-10 text-center">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Check className="w-5 h-5 text-emerald-500" />
                            </div>
                            <p className="text-xs font-bold text-foreground">Sin alertas críticas</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Ecosistema bajo control.</p>
                        </div>
                    ) : (
                        notifications.map((n) => {
                            const isActing = actingId === n.id;
                            const orgName = n.alert?.organization?.name;
                            return (
                                <DropdownMenuItem key={n.id} className="p-4 focus:bg-muted/50 cursor-default block border-b border-border/50 last:border-0 transition-colors">
                                    <div className="flex gap-3">
                                        <div className="mt-0.5 shrink-0">
                                            {isActing ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : getIcon(n.metadata)}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[11px] font-black leading-none text-foreground truncate">{n.title}</p>
                                                        {orgName && (
                                                            <Badge variant="outline" className="text-[7px] font-bold px-1 h-3.5 border-black/5 bg-black/5">{orgName.slice(0, 10)}</Badge>
                                                        )}
                                                    </div>
                                                    {n.metadata?.ruleCode && (
                                                        <span className="text-[7px] font-mono uppercase opacity-40 mt-0.5">{n.metadata.ruleCode}</span>
                                                    )}
                                                </div>
                                                <span className="text-[8px] font-bold text-muted-foreground/60 uppercase shrink-0">
                                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: false, locale: es })}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{n.body}</p>
                                            
                                            <div className="flex items-center justify-between pt-2">
                                                <div className="flex items-center gap-2">
                                                    {n.metadata?.href && (
                                                        <Link href={n.metadata.href}>
                                                            <span className="text-[9px] font-black text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
                                                                <ExternalLink className="w-2 h-2" />
                                                                Ver
                                                            </span>
                                                        </Link>
                                                    )}
                                                    {n.metadata?.fingerprint && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                const note = prompt("Nota de resolución:");
                                                                if (note !== null) handleOperationalAction(n.id, n.metadata!.fingerprint!, (fp) => resolveCockpitAlert(fp, note));
                                                            }}
                                                            disabled={isActing}
                                                            className="text-[9px] font-black text-emerald-600 hover:underline uppercase disabled:opacity-50"
                                                        >
                                                            Resolver
                                                        </button>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleMarkRead(n.id);
                                                    }}
                                                    disabled={isActing}
                                                    className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-tight transition-colors disabled:opacity-50"
                                                >
                                                    Archivar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            );
                        })
                    )}
                </div>

                <DropdownMenuSeparator className="m-0" />
                <div className="p-2.5 text-center bg-muted/20">
                    <button
                        onClick={() => loadData({ current: true })}
                        className="text-[9px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-[0.2em]"
                    >
                        Refrescar Engine
                    </button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function Activity({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    );
}
