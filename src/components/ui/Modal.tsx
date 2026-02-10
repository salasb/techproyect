'use client';

import { X } from "lucide-react";
import { useEffect, ReactNode } from "react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    maxWidth = 'lg'
}: Props) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const maxWidthClasses = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
        '4xl': 'sm:max-w-4xl',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Panel */}
            <div className={`relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl transform transition-all w-full sm:mx-auto animate-in zoom-in-95 duration-200 border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh] ${maxWidthClasses[maxWidth]}`}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                            {title}
                        </h3>
                        {description && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                    {children}
                </div>
            </div>
        </div>
    );
}
