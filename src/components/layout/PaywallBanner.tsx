'use client';

import { AlertTriangle, Crown, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useShellCommercialDisplay } from "./ShellCommercialDisplay";

export interface PaywallBannerProps {
    status: 'TRIALING' | 'ACTIVE' | 'PAUSED' | 'PAST_DUE' | 'CANCELED';
    trialEndsAt?: Date | null;
    variant?: 'A' | 'B'; // For experiments
}

export function PaywallBanner({ status, trialEndsAt, variant = 'A' }: PaywallBannerProps) {
    const display = useShellCommercialDisplay();

    // MANDATORY SUPPRESSION
    if (display.suppressCommercialPrompts || status === 'ACTIVE') return null;

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
            : "Suscripción interrumpida. Regulariza tus pagos para continuar operando.";
        config.cta = "Resolver Pago";
    } else {
        return null;
    }

    return (
        <div className={cn(
            "h-10 flex items-center justify-center px-4 gap-4 animate-in slide-in-from-top-full duration-500 sticky top-0 z-[60] shadow-md",
            config.bg,
            config.text
        )}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                {config.icon}
                <span>{config.message}</span>
            </div>
            
            <Link 
                href={config.href}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
            >
                {config.cta}
                <ArrowRight className="w-3 h-3" />
            </Link>
        </div>
    );
}
