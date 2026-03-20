import React from 'react';
import { LucideIcon, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    className?: string;
    variant?: 'default' | 'card' | 'minimal';
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    actionHref,
    className,
    variant = 'default'
}: EmptyStateProps) {
    const isMinimal = variant === 'minimal';
    const isCard = variant === 'card';

    return (
        <div className={cn(
            "flex flex-col items-center justify-center text-center animate-in fade-in duration-700",
            isCard && "bg-card border border-border rounded-2xl p-12 shadow-sm",
            !isCard && !isMinimal && "py-20",
            isMinimal && "py-8",
            className
        )}>
            <div className={cn(
                "rounded-full flex items-center justify-center mb-4",
                isMinimal ? "w-10 h-10 bg-muted/50" : "w-16 h-16 bg-primary/5"
            )}>
                <Icon className={cn(
                    "text-muted-foreground opacity-40",
                    isMinimal ? "w-5 h-5" : "w-8 h-8"
                )} />
            </div>
            
            <div className="space-y-1 max-w-sm">
                <h3 className={cn(
                    "font-bold text-foreground tracking-tight",
                    isMinimal ? "text-sm" : "text-lg"
                )}>
                    {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                </p>
            </div>

            {actionLabel && actionHref && (
                <div className="mt-6">
                    <Link href={actionHref}>
                        <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 hover:bg-primary/90 transition-all active:scale-95">
                            {actionLabel}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </Link>
                </div>
            )}
        </div>
    );
}
