"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CancelModal } from "@/components/dashboard/CancelModal";
import { logCancelIntent } from "@/app/actions/subscription-management";
import { createCustomerPortalSession } from "@/app/actions/subscription";
import { useToast } from "@/components/ui/Toast";
import { CancellationReason } from "@prisma/client";

export function BillingClient({ variant }: { variant: 'CONTINUITY' | 'VALUE_ROI' }) {
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const { toast } = useToast();

    const handleConfirmCancel = async (reason: CancellationReason, comment?: string) => {
        try {
            await logCancelIntent({ reason, comment, variant });
            // For now, we redirect to portal to actually cancel or we could trigger a custom action
            await createCustomerPortalSession();
        } catch (error) {
            toast({ type: "error", message: "No se pudo procesar la solicitud" });
        }
    };

    return (
        <>
            <Button
                variant="ghost"
                className="text-zinc-500 hover:text-red-600 font-bold text-xs"
                onClick={() => setIsCancelOpen(true)}
            >
                Cancelar Suscripción
            </Button>

            <CancelModal
                isOpen={isCancelOpen}
                onClose={() => setIsCancelOpen(false)}
                variant={variant}
                onConfirm={handleConfirmCancel}
            />
        </>
    );
}
