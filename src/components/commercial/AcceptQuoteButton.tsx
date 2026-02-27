'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { acceptQuoteAction } from "@/actions/commercial";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function AcceptQuoteButton({ quoteId, disabled = false }: { quoteId: string, disabled?: boolean }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleAccept = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!confirm("¿Confirmas la aceptación de esta cotización? Se generará automáticamente la factura correspondiente.")) {
            return;
        }

        setLoading(true);
        try {
            const res = await acceptQuoteAction(quoteId);
            if (res.success) {
                toast.success(res.message);
                router.push('/invoices'); // Navigate to invoices to see the result
            } else {
                toast.error(res.error || "Fallo al aceptar la cotización.");
            }
        } catch (error) {
            toast.error("Error de comunicación.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button 
            size="sm" 
            variant="default"
            disabled={loading || disabled}
            onClick={handleAccept}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 rounded-lg px-4 gap-2 shadow-sm"
        >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Aceptar
        </Button>
    );
}
