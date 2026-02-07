'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'info' | 'loading'

interface Toast {
    id: string
    type: ToastType
    message: string
    duration?: number
}

interface ToastContextType {
    toast: (props: { type: ToastType; message: string; duration?: number }) => void
    dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const addToast = useCallback(({ type, message, duration = 3000 }: { type: ToastType; message: string; duration?: number }) => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts((prev) => [...prev, { id, type, message, duration }])

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id)
            }, duration)
        }
    }, [removeToast])

    return (
        <ToastContext.Provider value={{ toast: addToast, dismiss: removeToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={cn(
                            "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in",
                            "bg-white dark:bg-zinc-900/95 backdrop-blur-sm",
                            t.type === 'success' && "border-green-200 text-green-700 dark:border-green-900/50 dark:text-green-400",
                            t.type === 'error' && "border-red-200 text-red-700 dark:border-red-900/50 dark:text-red-400",
                            t.type === 'info' && "border-blue-200 text-blue-700 dark:border-blue-900/50 dark:text-blue-400",
                            t.type === 'loading' && "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                        )}
                        role="alert"
                    >
                        <div className="flex-shrink-0">
                            {t.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                            {t.type === 'error' && <AlertCircle className="w-5 h-5" />}
                            {t.type === 'info' && <Info className="w-5 h-5" />}
                            {t.type === 'loading' && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
                        </div>
                        <p className="text-sm font-medium flex-1 leading-snug">{t.message}</p>
                        <button
                            onClick={() => removeToast(t.id)}
                            className="flex-shrink-0 ml-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}
