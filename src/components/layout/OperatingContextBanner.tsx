"use client";

import React from "react";
import { Shield, ArrowRight, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface OperatingContextBannerProps {
    orgName: string;
    isSuperadmin: boolean;
}

/**
 * High-visibility banner for Superadmins operating within a specific organization context.
 */
export function OperatingContextBanner({ orgName, isSuperadmin }: OperatingContextBannerProps) {
    if (!isSuperadmin) return null;

    return (
        <div 
            className="bg-zinc-900 border-b border-white/5 px-4 py-2.5 flex items-center justify-between sticky top-0 z-[60] shadow-lg animate-in slide-in-from-top duration-500"
            data-testid="local-context-banner"
        >
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-600 rounded text-[10px] font-black text-white uppercase tracking-wider shadow-sm shadow-blue-500/20">
                    <Shield className="w-3 h-3" />
                    Modo Superadmin
                </div>
                <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-white">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operando en:</span>
                    <span className="text-sm font-black italic text-blue-400 truncate max-w-[200px]" data-testid="local-context-org-name">
                        {orgName}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button 
                    asChild 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all gap-2"
                    data-testid="back-to-cockpit-button"
                >
                    <Link href="/admin">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        Volver al Cockpit
                        <ArrowRight className="w-3 h-3 opacity-50" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}
