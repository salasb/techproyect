'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import { sendQuoteAction } from "@/actions/commercial";
import { toast } from "sonner";

export function SendQuoteButton({ quoteId, disabled = false }: { quoteId: string, disabled?: boolean }) {
    const [loading, setLoading] = useState(false);

    const handleSend = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!confirm("¿Deseas marcar esta cotización como enviada? Esto habilitará la opción de aceptación para el cliente.")) {
            return;
        }

        setLoading(true);
        try {
            const res = await sendQuoteAction(quoteId);
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.error || "Fallo al enviar la cotización.");
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
            variant="outline"
            disabled={loading || disabled}
            onClick={handleSend}
            className="h-8 rounded-lg px-4 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
        >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
            Enviar
        </Button>
    );
}
