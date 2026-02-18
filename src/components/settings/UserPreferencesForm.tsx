"use client";

import React, { useState } from "react";
import { Sparkles, BellRing } from "lucide-react";
import { updateProfilePreference } from "@/app/actions/users";
import { toast } from "sonner";

interface UserPreferencesFormProps {
    userId: string;
    initialPreferences: {
        receiveProductTips: boolean;
    };
}

export function UserPreferencesForm({ userId, initialPreferences }: UserPreferencesFormProps) {
    const [receiveTips, setReceiveTips] = useState(initialPreferences.receiveProductTips);
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = async (checked: boolean) => {
        setIsLoading(true);
        try {
            await updateProfilePreference(userId, { receiveProductTips: checked });
            setReceiveTips(checked);
            toast.success("Preferencias actualizadas");
        } catch (error) {
            toast.error("Error al actualizar preferencias");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-zinc-50/50">
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-foreground">Tips de Producto y Nudges</h4>
                        <p className="text-xs text-muted-foreground">Recibe sugerencias personalizadas para optimizar tu flujo de trabajo y notificaciones sobre nuevas funcionalidades.</p>
                    </div>
                </div>
                <div className="flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={receiveTips}
                            onChange={(e) => handleToggle(e.target.checked)}
                            disabled={isLoading}
                        />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-primary"></div>
                    </label>
                </div>
            </div>

            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-zinc-50/50">
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <BellRing className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-foreground">Alertas de Facturación</h4>
                        <p className="text-xs text-muted-foreground">Notificaciones críticas sobre el estado de tu suscripción, trial y pagos. (Obligatorio)</p>
                    </div>
                </div>
                <div className="flex items-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border border-zinc-200 px-2 py-1 rounded bg-white">Siempre Activo</span>
                </div>
            </div>
        </div>
    );
}
