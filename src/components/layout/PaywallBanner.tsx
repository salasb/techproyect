'use client';

import { AlertCircle, CreditCard, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PaywallBannerProps {
    status: 'TRIALING' | 'PAUSED' | 'ACTIVE' | 'PAST_DUE';
    trialEndsAt?: string | null;
    className?: string;
}

export function PaywallBanner({ status, trialEndsAt, className }: PaywallBannerProps) {
    if (status === 'ACTIVE') return null;

    const daysRemaining = trialEndsAt
        ? Math.ceil((new Date(trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    const isExpiringSoon = status === 'TRIALING' && daysRemaining <= 3 && daysRemaining > 0;
    const isPaused = status === 'PAUSED';
    const isPastDue = status === 'PAST_DUE';

    if (!isExpiringSoon && !isPaused && !isPastDue) return null;

    return (
        <Alert
            variant={isPaused ? "destructive" : "default"}
            className={cn(
                "mb-6 border-l-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500",
                isExpiringSoon && "border-amber-500 bg-amber-50 dark:bg-amber-950/20",
                isPaused && "border-rose-600 bg-rose-50 dark:bg-rose-950/20",
                className
            )}
        >
            <div className="flex items-center justify-between w-full">
                <div className="flex items-start gap-3">
                    {isPaused ? <Lock className="h-5 w-5 mt-0.5" /> : <Clock className="h-5 w-5 mt-0.5" />}
                    <div>
                        <AlertTitle className="font-bold">
                            {isPaused ? "Acceso de Solo Lectura Activo" :
                                isExpiringSoon ? `Tu prueba gratuita termina en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}` :
                                    "Problema con el pago"}
                        </AlertTitle>
                        <AlertDescription className="text-sm opacity-90">
                            {isPaused ? "Tu trial ha expirado. Puedes ver tus datos pero no realizar cambios nuevos." :
                                isExpiringSoon ? "Asegura la continuidad de tu equipo activando un plan Pro antes de que expire el trial." :
                                    "Hubo un error con tu suscripción actual. Por favor, actualiza tus datos de facturación."}
                        </AlertDescription>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant={isPaused ? "destructive" : "default"} className="font-semibold shadow-md">
                        <Link href="/settings/billing" className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            {isPaused ? "Activar Plan Pro" : "Ver Planes"}
                        </Link>
                    </Button>
                </div>
            </div>
        </Alert>
    );
}
