"use client"

import { AlertTriangle, CreditCard, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePaywall } from "./PaywallContext";
import { createCustomerPortalSession } from "@/app/actions/subscription";

export function DunningBanner({ subscription }: { subscription: any }) {
    if (!subscription || (subscription.status !== 'PAST_DUE' && subscription.status !== 'PAUSED')) return null;

    const isPaused = subscription.status === 'PAUSED';
    const bgColor = isPaused ? 'bg-rose-600 dark:bg-rose-700' : 'bg-amber-600 dark:bg-amber-700';
    const Icon = isPaused ? CreditCard : AlertTriangle;
    const message = isPaused 
        ? "Tu cuenta ha sido PAUSADA por falta de pago. El acceso a funciones de edición está bloqueado hasta que regularices tu situación."
        : "Error en el pago: Tu suscripción está en mora. Actualiza tu método de pago para evitar la interrupción del servicio.";

    return (
        <div className={`${bgColor} text-white px-4 py-2.5 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-8 animate-in slide-in-from-top duration-500`}>
            <div className="flex items-center gap-2 text-sm font-bold text-center md:text-left">
                <div className="bg-white/20 p-1 rounded-full shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                </div>
                <span>{message}</span>
            </div>

            <div className="flex items-center gap-3">
                <form action={createCustomerPortalSession}>
                    <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white hover:bg-zinc-100 text-rose-700 font-bold border-none shadow-sm h-8"
                    >
                        <CreditCard className="w-3.5 h-3.5 mr-2" />
                        {isPaused ? "Reactivar Cuenta" : "Resolver Ahora"}
                    </Button>
                </form>
                {!isPaused && (
                    <div className="text-[10px] uppercase tracking-tighter opacity-80 font-black hidden md:block">
                        Reintento automático programado
                    </div>
                )}
            </div>
        </div>
    );
}
