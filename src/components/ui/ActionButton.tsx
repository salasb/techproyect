'use client';

import { useState } from 'react';
import { LoadingButton } from './LoadingButton';
import { useToast } from '@/components/ui/Toast';

interface ActionButtonProps extends React.ComponentProps<typeof LoadingButton> {
    action?: () => Promise<any>;
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: () => void;
}

export function ActionButton({
    action,
    onClick,
    successMessage,
    errorMessage = "Ocurrió un error inesperado",
    onSuccess,
    children,
    ...props
}: ActionButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (onClick) {
            onClick(e);
        }

        if (action) {
            try {
                setIsLoading(true);
                await action();
                if (successMessage) {
                    toast({ type: 'success', message: successMessage });
                }
                if (onSuccess) {
                    onSuccess();
                }
            } catch (error) {
                console.error(error);
                toast({ type: 'error', message: errorMessage });
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <LoadingButton
            isLoading={isLoading}
            onClick={handleClick}
            {...props}
        >
            {children}
        </LoadingButton>
    );
}
