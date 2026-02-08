import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    loadingText?: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    children: React.ReactNode;
}

export function LoadingButton({
    isLoading = false,
    loadingText = 'Guardando...',
    variant = 'primary',
    size = 'md',
    className,
    children,
    disabled,
    ...props
}: LoadingButtonProps) {

    // Base styles
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

    // Variants
    const variants = {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow focus:ring-primary/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary/50",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground focus:ring-ring",
        ghost: "hover:bg-accent hover:text-accent-foreground focus:ring-ring",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    };

    // Sizes
    const sizes = {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 py-2 text-sm",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
    };

    return (
        <button
            className={cn(
                baseStyles,
                variants[variant],
                sizes[size],
                className
            )}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {loadingText}
                </>
            ) : (
                children
            )}
        </button>
    );
}
