import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    PlayCircle,
    FileText,
    Ban,
    Lock
} from "lucide-react";

export type StatusType = 'PROJECT' | 'INVOICE' | 'QUOTE';

interface StatusBadgeProps {
    status: string;
    type: StatusType;
    className?: string;
}

// Configuration for all statuses
const STATUS_CONFIG: Record<StatusType, Record<string, { label: string; color: string; icon: any }>> = {
    PROJECT: {
        EN_CURSO: { label: "En Curso", color: "bg-blue-100/50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900", icon: PlayCircle },
        EN_ESPERA: { label: "En Espera", color: "bg-amber-100/50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900", icon: Clock },
        BLOQUEADO: { label: "Bloqueado", color: "bg-red-100/50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900", icon: Lock },
        CERRADO: { label: "Finalizado", color: "bg-emerald-100/50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900", icon: CheckCircle2 },
        CANCELADO: { label: "Cancelado", color: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700", icon: Ban },
    },
    INVOICE: {
        DRAFT: { label: "Borrador", color: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500", icon: FileText },
        SENT: { label: "Enviada", color: "bg-blue-100/50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400", icon: PlayCircle },
        PAID: { label: "Pagada", color: "bg-emerald-100/50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400", icon: CheckCircle2 },
        OVERDUE: { label: "Vencida", color: "bg-red-100/50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400", icon: AlertCircle },
        VOID: { label: "Nula", color: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500", icon: Ban },
    },
    QUOTE: {
        DRAFT: { label: "Borrador", color: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500", icon: FileText },
        SENT: { label: "Enviada", color: "bg-blue-100/50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400", icon: PlayCircle },
        ACCEPTED: { label: "Aceptada", color: "bg-emerald-100/50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400", icon: CheckCircle2 },
        REJECTED: { label: "Rechazada", color: "bg-red-100/50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400", icon: XCircle },
        EN_ESPERA: { label: "En Espera", color: "bg-amber-100/50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900", icon: Clock },
    }
};

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
    const config = STATUS_CONFIG[type][status] || {
        label: status,
        color: "bg-zinc-100 text-zinc-500 border-zinc-200",
        icon: FileText
    };

    const Icon = config.icon;

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
            config.color,
            className
        )}>
            <Icon className="w-3.5 h-3.5" />
            {config.label}
        </span>
    );
}
