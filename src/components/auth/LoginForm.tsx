'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowRight, AlertCircle, CheckCircle, Copy, Check } from 'lucide-react'
import { login, signup, forgotPassword } from '@/app/login/actions'
import { useToast } from '@/components/ui/Toast'

export function LoginForm() {
    const { toast } = useToast()
    const [isVisible, setIsVisible] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
    const [error, setError] = useState<{msg: string, traceId?: string} | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [email, setEmail] = useState('')
    const [cooldown, setCooldown] = useState(0)
    const [isCopied, setIsCopied] = useState(false)

    // Cooldown timer logic
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [cooldown])

    const toggleVisibility = () => setIsVisible(!isVisible)

    const copyTraceId = (id: string) => {
        navigator.clipboard.writeText(id)
        setIsCopied(true)
        toast({ type: 'success', message: 'Código copiado al portapapeles' })
        setTimeout(() => setIsCopied(false), 2000)
    }

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
                if (result.success) setCooldown(60)
            }

            if (result?.error) {
                setError({ msg: result.error, traceId: result.traceId })
            } else if (result?.message) {
                setMessage(result.message)
                if (mode === 'forgot') setEmail('')
            }
        } catch (e) {
            // Handled by NEXT_REDIRECT
        } finally {
            setIsLoading(false)
        }
    }

    if (mode === 'forgot') {
        return (
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-zinc-800 p-10 space-y-8 animate-in zoom-in duration-500">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-blue-600 mb-2">
                        <Lock className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Recuperar Acceso</h2>
                    <p className="text-slate-500 text-sm font-medium italic">Enviaremos un enlace seguro a tu bandeja de entrada.</p>
                </div>

                {error && (
                    <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl space-y-4 animate-in fade-in zoom-in">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            <p className="text-rose-700 text-xs font-bold leading-relaxed">{error.msg}</p>
                        </div>
                        {error.traceId && (
                            <div className="flex items-center justify-between bg-white/50 p-2 rounded-xl border border-rose-200/50">
                                <code className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-black">Ref: {error.traceId}</code>
                                <button 
                                    type="button"
                                    onClick={() => copyTraceId(error.traceId!)}
                                    className="p-1 hover:bg-rose-100 rounded-lg transition-colors text-rose-600"
                                >
                                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {message && (
                    <div className="p-6 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-3xl text-sm flex items-start gap-3 animate-in fade-in zoom-in">
                        <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="font-medium italic leading-relaxed">{message}</p>
                    </div>
                )}

                <form action={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ejemplo@empresa.com"
                                className="w-full pl-12 pr-4 h-14 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 font-bold focus:bg-white transition-all outline-none focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || cooldown > 0}
                        className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase italic tracking-widest text-sm shadow-xl shadow-blue-900/20 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : cooldown > 0 ? `Reintentar en ${cooldown}s` : 'Enviar Instrucciones'}
                    </button>

                    <button
                        type="button"
                        onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                        className="w-full text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 tracking-widest transition-colors"
                    >
                        ← Volver al Inicio
                    </button>
                </form>
            </div>
        )
    }

    return (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden animate-in fade-in duration-700">
            {/* Header / Tabs */}
            <div className="grid grid-cols-2 text-center border-b border-slate-100 dark:border-zinc-800">
                <button
                    onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                    className={`py-5 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'login'
                        ? 'bg-white dark:bg-zinc-900 text-blue-600 border-b-4 border-blue-600'
                        : 'bg-slate-50 dark:bg-zinc-950 text-slate-400 hover:text-slate-600'
                        }`}
                >
                    Iniciar Sesión
                </button>
                <button
                    onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
                    className={`py-5 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'signup'
                        ? 'bg-white dark:bg-zinc-900 text-blue-600 border-b-4 border-blue-600'
                        : 'bg-slate-50 dark:bg-zinc-950 text-slate-400 hover:text-slate-600'
                        }`}
                >
                    Crear Cuenta
                </button>
            </div>

            <div className="p-10 space-y-8">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase">
                        {mode === 'login' ? 'Bienvenido' : 'Únete a TechWise'}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium italic">
                        {mode === 'login'
                            ? 'Accede a tu panel de control operacional.'
                            : 'Empieza a gestionar tus proyectos hoy.'}
                    </p>
                </div>

                {error && (
                    <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl space-y-2 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center text-rose-600 font-bold text-sm">
                            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                            {error.msg}
                        </div>
                        <div className="flex gap-4 ml-6">
                            {mode === 'login' && (
                                <button onClick={() => setMode('signup')} className="text-[9px] font-black uppercase text-rose-700 hover:underline tracking-widest">Crear Cuenta</button>
                            )}
                            <button onClick={() => setMode('forgot')} className="text-[9px] font-black uppercase text-rose-700 hover:underline tracking-widest">Recuperar Clave</button>
                        </div>
                    </div>
                )}

                {message && (
                    <div className="p-6 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-3xl text-sm flex items-center animate-in fade-in slide-in-from-top-2">
                        <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                        {message}
                    </div>
                )}

                <form action={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ejemplo@empresa.com"
                                    className="w-full pl-12 pr-4 h-14 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-zinc-900 transition-all outline-none focus:ring-4 focus:ring-blue-500/10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contraseña</label>
                                {mode === 'login' && (
                                    <button 
                                        type="button"
                                        onClick={() => setMode('forgot')}
                                        className="text-[9px] font-bold text-blue-600 hover:underline uppercase tracking-tighter"
                                    >
                                        ¿Olvidaste tu clave?
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    name="password"
                                    type={isVisible ? 'text' : 'password'}
                                    required
                                    placeholder="********"
                                    className="w-full pl-12 pr-12 h-14 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-zinc-900 transition-all outline-none focus:ring-4 focus:ring-blue-500/10"
                                />
                                <button
                                    type="button"
                                    onClick={toggleVisibility}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {isVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase italic tracking-[0.2em] text-sm shadow-2xl shadow-blue-900/30 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center"
                    >
                        {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : mode === 'login' ? 'Entrar al Sistema' : 'Crear mi Cuenta'}
                        {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
                    </button>
                </form>
            </div>
        </div>
    )
}
