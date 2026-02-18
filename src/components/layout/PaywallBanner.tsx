"use client";

import React from "react";
import { AlertTriangle, Crown, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface PaywallBannerProps {
    status: 'TRIALING' | 'ACTIVE' | 'PAUSED' | 'PAST_DUE' | 'CANCELED';
    trialEndsAt?: Date | null;
    variant?: 'A' | 'B'; // For experiments
}

export function PaywallBanner({ status, trialEndsAt, variant = 'A' }: PaywallBannerProps) {
    if (status === 'ACTIVE') return null;

    let config = {
        bg: "bg-amber-500",
        text: "text-white",
        icon: <AlertTriangle className="w-4 h-4" />,
        message: "",
        cta: "Activar Plan",
        href: "/settings/billing"
    };

    const diffDays = trialEndsAt ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

    if (status === 'TRIALING') {
        if (diffDays > 3) return null; // Only show banner in last 3 days

        config.bg = "bg-blue-600";
        config.message = variant === 'A'
            ? `Tu periodo de prueba termina en ${diffDays} ${diffDays === 1 ? 'día' : 'días'}.`
            : `¡No pierdas el acceso! Tu trial expira en ${diffDays} ${diffDays === 1 ? 'día' : 'días'}.`;
        config.cta = "Elegir Plan";
    } else if (status === 'PAST_DUE' || status === 'PAUSED') {
        config.bg = "bg-red-600";
        config.message = variant === 'A'
            ? "Tu cuenta está en modo lectura por falta de pago."
            : "Acceso restringido. Activa tu suscripción para seguir creando proyectos.";
        config.icon = <AlertTriangle className="w-4 h-4 animate-pulse" />;
    } else if (status === 'CANCELED') {
        config.bg = "bg-zinc-800";
        config.message = "Suscripción cancelada. Tu cuenta pasará a modo lectura pronto.";
        config.cta = "Reactivar";
    }

    return (
        <div className={cn(
            "w-full px-6 py-2 flex items-center justify-between gap-4 transition-all duration-500 animate-in slide-in-from-top",
            config.bg,
            config.text
        )}>
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-1.5 rounded-lg">
                    {config.icon}
                </div>
                <p className="text-xs font-bold tracking-tight uppercase">
                    {config.message}
                </p>
            </div>

            <Link href={config.href}>
                <button className="bg-white text-zinc-950 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-100 transition-colors flex items-center gap-1 shadow-lg">
                    <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                    {config.cta}
                    <ArrowRight className="w-3 h-3" />
                </button>
            </Link>
        </div>
    );
}
