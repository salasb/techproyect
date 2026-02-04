'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowRight } from 'lucide-react'
import { login, signup } from '@/app/login/actions'

export function LoginForm() {
    const [isVisible, setIsVisible] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    const toggleVisibility = () => setIsVisible(!isVisible)

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true)
        setError(null)
        setMessage(null)

        try {
            let result;
            if (mode === 'login') {
                result = await login(formData)
            } else {
                result = await signup(formData)
            }

            if (result?.error) {
                setError(result.error)
            } else {
                // Si no hay error y no redirigió (rara vez pasa en login exitoso por el redirect, 
                // pero en signup puede pasar si requiere confirmación)
                if (mode === 'signup') {
                    setMessage("¡Cuenta creada! Si no eres redirigido, por favor verifica tu correo.")
                }
            }
        } catch (e) {
            // Next.js redirects throw errors, we need to ignore them or handle actual errors
            // but usually redirect() works by throwing NEXT_REDIRECT
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Header / Tabs */}
            <div className="grid grid-cols-2 text-center border-b border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={() => setMode('login')}
                    className={`py-4 text-sm font-medium transition-colors ${mode === 'login'
                        ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                        }`}
                >
                    Iniciar Sesión
                </button>
                <button
                    onClick={() => setMode('signup')}
                    className={`py-4 text-sm font-medium transition-colors ${mode === 'signup'
                        ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                        }`}
                >
                    Crear Cuenta
                </button>
            </div>

            <div className="p-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                        {mode === 'login' ? 'Bienvenido de nuevo' : 'Únete a TechProyect'}
                    </h2>
                    <p className="text-sm text-zinc-500">
                        {mode === 'login'
                            ? 'Ingresa tus credenciales para acceder al dashboard.'
                            : 'Comienza a gestionar tus cotizaciones hoy mismo.'}
                    </p>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center animate-in fade-in slide-in-from-top-2">
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                    </div>
                )}

                {message && (
                    <div className="p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm flex items-center animate-in fade-in slide-in-from-top-2">
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {message}
                    </div>
                )}

                <form action={handleSubmit} className="space-y-5">
                    <div className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="tunombre@empresa.com"
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                            <input
                                name="password"
                                type={isVisible ? 'text' : 'password'}
                                required
                                placeholder="********"
                                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                            <button
                                type="button"
                                onClick={toggleVisibility}
                                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
                            >
                                {isVisible ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {mode === 'login' && (
                        <div className="flex justify-end">
                            <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                                ¿Olvidaste tu contraseña?
                            </a>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                        {mode === 'login' ? 'Ingresar' : 'Registrarse'}
                        {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </button>
                </form>
            </div>
        </div>
    )
}
