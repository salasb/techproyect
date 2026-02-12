'use client';

import { X, AlertTriangle, Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !isLoading) onCancel();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            // Only reset overflow if *this* dialog is closing, ideally we'd track stack depth but this is simple fix
            // A safer way is to check if any other dialogs are open, but for now allow reset.
            if (!document.querySelector('[role="dialog"]')) {
                document.body.style.overflow = 'unset';
            } else {
                // heuristic: if we are unmounting but another dialog exists, keep hidden?
                // simpler: just always unset, creating a slight jump is better than locked scroll
                document.body.style.overflow = 'unset';
            }
        };
    }, [isOpen, onCancel, isLoading]);

    if (!mounted || !isOpen) return null;

    const variantStyles = {
        danger: {
            icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
            bgIcon: "bg-red-100 dark:bg-red-900/30",
            button: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
            title: "text-red-900 dark:text-red-400"
        },
        warning: {
            icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
            bgIcon: "bg-yellow-100 dark:bg-yellow-900/30",
            button: "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500",
            title: "text-yellow-900 dark:text-yellow-400"
        },
        info: {
            icon: <AlertTriangle className="w-6 h-6 text-blue-600" />,
            bgIcon: "bg-blue-100 dark:bg-blue-900/30",
            button: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
            title: "text-blue-900 dark:text-blue-400"
        },
        success: {
            icon: <Check className="w-6 h-6 text-green-600" />,
            bgIcon: "bg-green-100 dark:bg-green-900/30",
            button: "bg-green-600 hover:bg-green-700 focus:ring-green-500",
            title: "text-green-900 dark:text-green-400"
        }
    };

    const currentStyle = variantStyles[variant];

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                onClick={!isLoading ? onCancel : undefined}
                aria-hidden="true"
            />

            {/* Modal Panel */}
            <div className="relative bg-background rounded-lg shadow-xl w-full sm:max-w-lg mx-auto animate-in zoom-in-95 duration-200 border border-border z-[101]">
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                        <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${currentStyle.bgIcon} sm:mx-0 sm:h-10 sm:w-10`}>
                            {currentStyle.icon}
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                            <h3 className="text-lg leading-6 font-medium text-foreground" id="modal-title">
                                {title}
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-muted-foreground">
                                    {description}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-muted/30 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg border-t border-border">
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
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-input shadow-sm px-4 py-2 bg-background text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                    >
                        {cancelText}
                    </button>
                </div>

                {/* Close Button X */}
                <button
                    onClick={onCancel}
                    disabled={isLoading}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>,
        document.body
    );
}
