import React from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { Button, ButtonProps } from './button';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends ButtonProps {
    isLoading?: boolean;
    loadingText?: string;
    status?: 'idle' | 'loading' | 'success' | 'error';
    successText?: string;
    errorText?: string;
}

export function LoadingButton({
    isLoading = false,
    loadingText = 'Guardando...',
    status = 'idle',
    successText = 'Guardado',
    errorText = 'Error',
    className,
    children,
    disabled,
    ...props
}: LoadingButtonProps) {
    // Derived state for backward compatibility with isLoading
    const currentStatus = isLoading ? 'loading' : status;

    const getContent = () => {
        switch (currentStatus) {
            case 'loading':
                return (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {loadingText}
                    </>
                );
            case 'success':
                return (
                    <>
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        {successText}
                    </>
                );
            case 'error':
                return (
                    <>
                        <X className="mr-2 h-4 w-4 text-red-500" />
                        {errorText}
                    </>
                );
            default:
                return children;
        }
    };

    // Determine variant based on status if needed, or stick to passed variant
    // For success/error, we might want to override variant, but for now let's keep it subtle
    // and just change content/icons unless explicitly asked.

    return (
        <Button
            className={cn(
                "transition-all duration-300 min-w-[100px]",
                currentStatus === 'success' && "bg-green-100 text-green-700 hover:bg-green-200 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
                currentStatus === 'error' && "bg-red-100 text-red-700 hover:bg-red-200 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
                className
            )}
            disabled={currentStatus === 'loading' || disabled}
            {...props}
        >
            {getContent()}
        </Button>
    );
}
