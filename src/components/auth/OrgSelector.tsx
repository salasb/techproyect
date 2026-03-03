"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Org {
    id: string;
    name: string;
    subscription?: {
        status: string | null;
    } | null;
}

export function OrgSelector({ orgs }: { orgs: Org[] }) {
    const router = useRouter();
    const [selectingId, setSelectingId] = useState<string | null>(null);

    const handleSelect = async (orgId: string) => {
        setSelectingId(orgId);
        try {
            const response = await fetch('/api/org/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orgId })
            });

            const result = await response.json();

            if (result.ok) {
                toast.success("Contexto actualizado. Redirigiendo...");
                // Refresh to ensure middleware/layouts see the new cookie
                router.refresh();
                // Navigate to dashboard
                router.replace(result.redirectTo || '/dashboard');
            } else {
                toast.error(result.error || "No se pudo seleccionar la organización.");
                setSelectingId(null);
            }
        } catch (error: any) {
            toast.error("Error de red al seleccionar organización.");
            setSelectingId(null);
        }
    };

    return (
        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {orgs.map(org => {
                const isSelecting = selectingId === org.id;
                return (
                    <button 
                        key={org.id}
                        disabled={!!selectingId}
                        onClick={() => handleSelect(org.id)}
                        className={cn(
                            "w-full text-left p-6 rounded-3xl border transition-all group flex items-center justify-between",
                            isSelecting 
                                ? "border-blue-500 bg-blue-50/50 ring-4 ring-blue-500/10 shadow-xl" 
                                : "border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5"
                        )}
                    >
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl border flex items-center justify-center transition-colors shadow-inner",
                                isSelecting ? "bg-blue-100 border-blue-200" : "bg-white border-slate-100 group-hover:bg-blue-50"
                            )}>
                                {isSelecting ? (
                                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                ) : (
                                    <Building2 className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                                )}
                            </div>
                            <div>
                                <p className="font-black uppercase text-sm tracking-tight text-slate-900">{org.name}</p>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[8px] font-black uppercase py-0 px-1 border-blue-100 text-blue-600 bg-blue-50/50">
                                        {org.subscription?.status || 'FREE'}
                                    </Badge>
                                    <span className="text-[9px] font-bold text-slate-400">ID: {org.id.substring(0,8)}</span>
                                </div>
                            </div>
                        </div>
                        {!isSelecting && (
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
