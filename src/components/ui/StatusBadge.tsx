import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_MAP } from "@/lib/status-mapping";
import {
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    PlayCircle,
    FileText,
    Ban,
    Lock,
    User,
    UserMinus,
    Ghost,
    ArrowRightLeft,
    LucideIcon
} from "lucide-react";

export type StatusType = 'PROJECT' | 'INVOICE' | 'QUOTE' | 'CLIENT' | 'RESIDENT';

interface StatusBadgeProps {
    status: string;
    type: StatusType;
    className?: string;
}

interface BadgeConfig {
    label: string;
    color: string;
    icon: LucideIcon;
}

const ICON_MAP: Record<string, LucideIcon> = {
    EN_CURSO: PlayCircle,
    EN_ESPERA: Clock,
    BLOQUEADO: Lock,
    CERRADO: CheckCircle2,
    CANCELADO: Ban,
    DRAFT: FileText,
    SENT: PlayCircle,
    PAID: CheckCircle2,
    OVERDUE: AlertCircle,
    VOID: Ban,
    ACCEPTED: CheckCircle2,
    REJECTED: XCircle,
    ACTIVE: User,
    INACTIVE: UserMinus,
    DECEASED: Ghost,
    TRANSFERRED: ArrowRightLeft,
    LEAD: User,
    PROSPECT: User,
    CLIENT: CheckCircle2,
    CHURNED: UserMinus,
};

const SPECIAL_CONFIG: Record<string, Record<string, Omit<BadgeConfig, 'icon'> & { icon: LucideIcon }>> = {
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
    }
};

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
    let config: BadgeConfig | undefined;

    // 1. Try specialized config first
    const special = SPECIAL_CONFIG[type];
    if (special && special[status]) {
        config = special[status];
    }

    // 2. Try canonical STATUS_MAP
    if (!config) {
        const canonicalType = type === 'RESIDENT' ? 'RESIDENT' : 
                            type === 'PROJECT' ? 'PROJECT' : 
                            type === 'CLIENT' ? 'CLIENT' : null;
        
        if (canonicalType && (STATUS_MAP as any)[canonicalType][status]) {
            const canonical = (STATUS_MAP as any)[canonicalType][status];
            config = {
                label: canonical.label,
                color: canonical.color,
                icon: ICON_MAP[status] || FileText
            };
        }
    }

    // 3. Fallback
    if (!config) {
        config = {
            label: status,
            color: "bg-zinc-100 text-zinc-500 border-zinc-200",
            icon: ICON_MAP[status] || FileText
        };
    }

    const Icon = config.icon;

    return (
        <span 
            data-testid={`status-badge-${status.toLowerCase()}`}
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
                config.color,
                className
            )}
        >
            <Icon className="w-3.5 h-3.5" />
            {config.label}
        </span>
    );
}