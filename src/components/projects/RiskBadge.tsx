import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface RiskBadgeProps {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    score: number;
    showScore?: boolean;
    className?: string;
}

export function RiskBadge({ level, score, showScore = false, className }: RiskBadgeProps) {
    const config = {
        LOW: {
            icon: ShieldCheck,
            color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900",
            label: "Riesgo Bajo"
        },
        MEDIUM: {
            icon: Shield,
            color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900",
            label: "Riesgo Medio"
        },
        HIGH: {
            icon: ShieldAlert,
            color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900",
            label: "Riesgo Alto"
        }
    };

    const { icon: Icon, color, label } = config[level];

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium cursor-help transition-colors", color, className)}>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                        {showScore && <span className="opacity-75 pl-1 border-l border-current/20">{score}</span>}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Score de Viabilidad: <strong>{score}/100</strong></p>
                    <p className="text-xs text-muted-foreground">Calculado por IA Heurística</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
