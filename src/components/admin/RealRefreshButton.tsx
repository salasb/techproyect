"use client";

import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { triggerAlertsEvaluation } from "@/app/actions/superadmin-v2";
import { toast } from "sonner";

export function RealRefreshButton() {
    const [loading, setLoading] = useState(false);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            const res = await triggerAlertsEvaluation();
            if (res.success && res.results) {
                toast.success("Ecosistema Sincronizado", {
                    description: `${res.results.created} alertas nuevas, ${res.results.resolved} resueltas.`
                });
            } else if (!res.success) {
                // High-fidelity error handling based on unified guard
                if (res.code === 'DEGRADED_CONFIG') {
                    toast.warning("Modo Seguro Activo", {
                        description: res.error
                    });
                } else if (res.code === 'UNAUTHORIZED') {
                    toast.error("Acceso Denegado", {
                        description: res.error
                    });
                } else {
                    toast.error("Error de Sincronización", {
                        description: res.error
                    });
                }
            }
        } catch {
            toast.error("Error inesperado en el motor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleRefresh}
            disabled={loading}
            variant="outline"
            className="w-full rounded-2xl border-blue-500/20 bg-blue-500/5 text-blue-600 hover:bg-blue-500/10 hover:border-blue-500/40 transition-all font-black uppercase tracking-widest text-[10px] h-12 gap-2"
        >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Sincronizando...' : 'Recalcular Salud'}
        </Button>
    );
}
