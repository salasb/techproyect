"use client";

import React, { useState, useEffect } from "react";
import { Bell, Info, AlertTriangle, ShieldAlert, Check } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markNotificationRead, getCockpitV2Data } from "@/app/actions/superadmin-v2";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function SuperadminNotificationCenter() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        const res = await getCockpitV2Data();
        if (res.success && res.notifications) {
            setNotifications(res.notifications);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleMarkRead = async (id: string) => {
        try {
            const res = await markNotificationRead(id);
            if (res.success) {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };

    const unreadCount = notifications.length;

    const getIcon = (metadata: any) => {
        const severity = (metadata as any)?.severity || "INFO";
        if (severity === "CRITICAL") return <ShieldAlert className="w-4 h-4 text-red-500" />;
        if (severity === "WARNING") return <AlertTriangle className="w-4 h-4 text-amber-500" />;
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
                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                        <Activity className="w-3 h-3 text-blue-500" />
                        Notificaciones
                    </h3>
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
                            <p className="text-[10px] text-muted-foreground mt-1">Todo el ecosistema está bajo control.</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <DropdownMenuItem key={n.id} className="p-4 focus:bg-muted/50 cursor-default block border-b border-border/50 last:border-0 transition-colors">
                                <div className="flex gap-3">
                                    <div className="mt-0.5 shrink-0">
                                        {getIcon(n.metadata)}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[11px] font-black leading-none text-foreground truncate">{n.title}</p>
                                            <span className="text-[8px] font-bold text-muted-foreground/60 uppercase shrink-0">
                                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: false, locale: es })}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{n.body}</p>
                                        <div className="flex items-center justify-end pt-1">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleMarkRead(n.id);
                                                }}
                                                className="text-[9px] font-black text-blue-600 hover:text-blue-500 uppercase tracking-tight transition-colors"
                                            >
                                                Marcar como leída
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>

                <DropdownMenuSeparator className="m-0" />
                <div className="p-2.5 text-center bg-muted/20">
                    <button
                        onClick={() => loadData()}
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
