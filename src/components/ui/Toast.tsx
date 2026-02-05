'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
    id: string
    type: ToastType
    message: string
}

interface ToastContextType {
    toast: (props: { type: ToastType; message: string }) => void
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

    const addToast = useCallback(({ type, message }: { type: ToastType; message: string }) => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts((prev) => [...prev, { id, type, message }])

        // Auto remove
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 3000)
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`
                            flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right-full transition-all duration-300
                            ${t.type === 'success' ? 'bg-white dark:bg-zinc-900 border-green-200 text-green-700 dark:text-green-400' : ''}
                            ${t.type === 'error' ? 'bg-white dark:bg-zinc-900 border-red-200 text-red-700 dark:text-red-400' : ''}
                            ${t.type === 'info' ? 'bg-white dark:bg-zinc-900 border-blue-200 text-blue-700 dark:text-blue-400' : ''}
                        `}
                    >
                        {t.type === 'success' && <CheckCircle className="w-5 h-5" />}
                        {t.type === 'error' && <AlertCircle className="w-5 h-5" />}
                        {t.type === 'info' && <Info className="w-5 h-5" />}
                        <span className="text-sm font-medium">{t.message}</span>
                        <button onClick={() => removeToast(t.id)} className="ml-2 hover:opacity-70">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}
