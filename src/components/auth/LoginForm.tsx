'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react'
import { login, signup, forgotPassword } from '@/app/login/actions'
import Link from 'next/link'

export function LoginForm() {
    const [isVisible, setIsVisible] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [email, setEmail] = useState('')

    const toggleVisibility = () => setIsVisible(!isVisible)

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true)
        setError(null)
        setMessage(null)

        try {
            let result: any;
            if (mode === 'login') {
                result = await login(formData)
            } else if (mode === 'signup') {
                result = await signup(formData)
            } else {
                result = await forgotPassword(formData)
            }

            if (result?.error) {
                setError(result.error)
            } else if (result?.message) {
                setMessage(result.message)
                if (mode === 'forgot') setEmail('') // Clear email on forgot success
            }
        } catch (e) {
            // Usually NEXT_REDIRECT
        } finally {
            setIsLoading(false)
        }
    }

    if (mode === 'forgot') {
        return (
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                        Recuperar contraseña
                    </h2>
                    <p className="text-sm text-zinc-500">
                        Ingresa tu correo y te enviaremos las instrucciones.
                    </p>
                </div>

                {message && (
                    <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm mb-6 animate-in fade-in zoom-in">
                        {message}
                    </div>
                )}

                <form action={handleSubmit} className="space-y-5">
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                        <input
                            name="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tunombre@empresa.com"
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Enviar instrucciones'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="w-full text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                        Volver al inicio
                    </button>
                </form>
            </div>
        )
    }

    return (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Header / Tabs */}
            <div className="grid grid-cols-2 text-center border-b border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                    className={`py-4 text-sm font-medium transition-colors ${mode === 'login'
                        ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                        }`}
                >
                    Iniciar Sesión
                </button>
                <button
                    onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
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
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center text-red-600 font-bold text-sm mb-1">
                            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                            {error}
                        </div>
                        <p className="text-xs text-red-500 ml-6 leading-tight">
                            {mode === 'login' 
                                ? 'Si no tienes cuenta, puedes crear una. Si olvidaste tu acceso, recupéralo.'
                                : 'Si ya tienes cuenta, intenta iniciar sesión o recuperar tu contraseña.'}
                        </p>
                        <div className="mt-3 ml-6 flex gap-4">
                            {mode === 'login' && (
                                <button 
                                    onClick={() => setMode('signup')}
                                    className="text-[10px] font-black uppercase text-red-700 hover:underline tracking-widest"
                                >
                                    Crear Cuenta
                                </button>
                            )}
                            <button 
                                onClick={() => setMode('forgot')}
                                className="text-[10px] font-black uppercase text-red-700 hover:underline tracking-widest"
                            >
                                Recuperar Acceso
                            </button>
                        </div>
                    </div>
                )}

                {message && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center animate-in fade-in slide-in-from-top-2">
                        <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
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
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                            <button 
                                type="button"
                                onClick={() => setMode('forgot')}
                                className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
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
