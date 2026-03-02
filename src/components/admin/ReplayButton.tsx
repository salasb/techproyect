"use client";

import React, { useState } from "react";
import { replayStripeEventAction } from "@/actions/superadmin";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ReplayButton({ eventId }: { eventId: string }) {
    const [loading, setLoading] = useState(false);

    const handleReplay = async () => {
        setLoading(true);
        try {
            const result = await replayStripeEventAction(eventId);
            if (result.success) {
                const traceId = (result as any).traceId;
                toast.success(`Replay iniciado (Trace: ${traceId})`);
                // Optional: refresh page after a small delay to see result
                setTimeout(() => window.location.reload(), 1500);
            } else {
                const error = (result as any).error;
                toast.error(error || "Error en el replay");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button 
            variant="outline" 
            size="sm" 
            disabled={loading}
            className="rounded-xl h-8 text-[10px] font-black uppercase tracking-widest border-border/50 hover:bg-zinc-900 hover:text-white transition-all"
            onClick={handleReplay}
        >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3 h-3 mr-1.5" />}
            Replay
        </Button>
    );
}
