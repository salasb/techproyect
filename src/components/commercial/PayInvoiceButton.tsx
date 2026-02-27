'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { createInvoicePaymentSession } from "@/actions/commercial";
import { toast } from "sonner";

export function PayInvoiceButton({ invoiceId, disabled = false }: { invoiceId: string, disabled?: boolean }) {
    const [loading, setLoading] = useState(false);

    const handlePay = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        setLoading(true);
        try {
            await createInvoicePaymentSession(invoiceId);
            // Redirection happens in the action
        } catch (error: any) {
            toast.error(error.message || "Error al generar sesión de pago.");
            setLoading(false);
        }
    };

    return (
        <Button 
            size="sm" 
            variant="default"
            disabled={loading || disabled}
            onClick={handlePay}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 rounded-lg px-4 gap-2 shadow-md shadow-blue-500/20"
        >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
            Pagar
        </Button>
    );
}
