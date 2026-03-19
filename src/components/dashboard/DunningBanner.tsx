'use client';

import { AlertTriangle, CreditCard, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePaywall } from "./PaywallContext";
import { createPortalSession } from "@/actions/billing";
import { useShellCommercialDisplay } from "../layout/ShellCommercialDisplay";

export function DunningBanner({ subscription }: { subscription: any }) {
    const display = useShellCommercialDisplay();

    // MANDATORY SUPPRESSION
    if (display.suppressCommercialPrompts || !subscription || (subscription.status !== 'PAST_DUE' && subscription.status !== 'PAUSED')) {
        return null;
    }

    const isPaused = subscription.status === 'PAUSED';
    const bgColor = isPaused ? 'bg-rose-600 dark:bg-rose-700' : 'bg-amber-600 dark:bg-amber-700';
    const Icon = isPaused ? CreditCard : AlertTriangle;

    const handleAction = async () => {
        try {
            await createPortalSession();
        } catch (e) {
            console.error("[DunningBanner] Failed to create portal session:", e);
        }
    };

    return (
        <div className={`${bgColor} text-white px-4 py-3 shadow-lg animate-in slide-in-from-top duration-500 sticky top-0 z-[50]`}>
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-center md:text-left">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-sm uppercase tracking-tight italic">
                            {isPaused ? 'Cuenta Suspendida' : 'Aviso de Cobranza'}
                        </p>
                        <p className="text-xs text-white/90">
                            {isPaused 
                                ? 'Tu acceso ha sido limitado. Regulariza tus pagos para continuar operando.' 
                                : 'Tu último pago no pudo ser procesado. Evita la interrupción del servicio.'}
                        </p>
                    </div>
                </div>
                
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleAction}
                    className="bg-white text-zinc-900 hover:bg-zinc-100 border-none rounded-full px-6 font-bold text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95"
                >
                    Resolver Ahora
                    <ChevronRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
            </div>
        </div>
    );
}
