'use client';

import { X, AlertTriangle, Check, Loader2 } from "lucide-react";
import { useEffect, useRef, ReactNode } from "react";

interface Props {
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    isOpen,
    title,
    description,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "danger",
    isLoading = false,
    onConfirm,
    onCancel
}: Props) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
            // Simple focus trap could be added here
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
            bgIcon: "bg-red-100",
            button: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
            title: "text-red-900"
        },
        warning: {
            icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
            bgIcon: "bg-yellow-100",
            button: "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500",
            title: "text-yellow-900"
        },
        info: {
            icon: <AlertTriangle className="w-6 h-6 text-blue-600" />,
            bgIcon: "bg-blue-100",
            button: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
            title: "text-blue-900"
        },
        success: {
            icon: <Check className="w-6 h-6 text-green-600" />,
            bgIcon: "bg-green-100",
            button: "bg-green-600 hover:bg-green-700 focus:ring-green-500",
            title: "text-green-900"
        }
    };

    const currentStyle = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in"
                onClick={onCancel}
                aria-hidden="true"
            />

            {/* Modal Panel */}
            <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-xl transform transition-all sm:max-w-lg w-full sm:mx-auto animate-in zoom-in-95 duration-200 border border-zinc-200 dark:border-zinc-800">
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                        <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${currentStyle.bgIcon} sm:mx-0 sm:h-10 sm:w-10`}>
                            {currentStyle.icon}
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                            <h3 className="text-lg leading-6 font-medium text-zinc-900 dark:text-white" id="modal-title">
                                {title}
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    {description}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg border-t border-zinc-100 dark:border-zinc-800">
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 transition-colors ${currentStyle.button}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Procesando...
                            </>
                        ) : confirmText}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-zinc-300 dark:border-zinc-700 shadow-sm px-4 py-2 bg-white dark:bg-zinc-800 text-base font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                    >
                        {cancelText}
                    </button>
                </div>

                {/* Close Button X */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-500"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
