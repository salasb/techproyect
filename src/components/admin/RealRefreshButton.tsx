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
            
            if (res.ok) {
                const data = res.data as { createdAlerts: number; resolvedAlerts: number };
                toast.success("Sincronización v4.4 Completa", {
                    description: `${res.message} (Nuevas: ${data.createdAlerts}, Resueltas: ${data.resolvedAlerts}, Trace: ${res.meta.traceId})`,
                    action: {
                        label: "Ver Alertas",
                        onClick: () => window.location.reload()
                    }
                });
            } else {
                // High-fidelity error handling based on v4.4 codes
                if (res.code === 'DEGRADED_CONFIG') {
                    toast.warning("Modo Seguro Activo", {
                        description: res.message
                    });
                } else if (res.code === 'UNAUTHORIZED') {
                    toast.error("Acceso Maestro Denegado", {
                        description: res.message
                    });
                } else if (res.code === 'PREVIEW_LOCKED') {
                    toast.info("Entorno de Lectura", {
                        description: res.message
                    });
                } else {
                    toast.error("Fallo Operacional", {
                        description: `${res.message} (ID: ${res.meta?.traceId || 'N/A'})`
                    });
                }
            }
        } catch {
            toast.error("Error inesperado en el túnel de comandos");
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
