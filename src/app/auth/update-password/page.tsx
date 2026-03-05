'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

export default function UpdatePasswordPage() {
    const supabase = createClient()
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

    useEffect(() => {
        // Verify if we have a recovery session
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setIsValidSession(!!session)
        }
        
        checkSession()

        // Supabase establishes the session automatically when returning from email link
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                setIsValidSession(true)
            }
        })

        return () => subscription.unsubscribe()
    }, [supabase.auth])

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.')
            setLoading(false)
            return
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.')
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.updateUser({
            password: password
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            setSuccess(true)
            setLoading(false)
            // Redirect after 3 seconds
            setTimeout(() => router.push('/login'), 3000)
        }
    }

    if (isValidSession === false) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
                <Card className="max-w-md w-full rounded-[3rem] p-12 text-center space-y-6 shadow-2xl border-none">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter">Sesión Inválida</h2>
                    <p className="text-slate-500 font-medium italic leading-relaxed">
                        El enlace ha expirado o es inválido. Por favor solicita uno nuevo desde la página de inicio de sesión.
                    </p>
                    <Button variant="outline" onClick={() => router.push('/login')} className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs border-slate-200">
                        Volver al Login
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <Card className="max-w-md w-full rounded-[3rem] p-10 shadow-2xl bg-white border-none space-y-8">
                <CardHeader className="text-center p-0 space-y-2">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-xl shadow-blue-900/20 text-white">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-4xl font-black tracking-tighter italic uppercase">Nueva Contraseña</CardTitle>
                    <CardDescription className="font-medium italic">Ingresa tu nueva clave de acceso segura.</CardDescription>
                </CardHeader>

                <CardContent className="p-0">
                    {success ? (
                        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] text-center space-y-4 animate-in zoom-in duration-300">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                            <p className="text-emerald-900 font-black uppercase italic text-sm">¡Actualizada con éxito!</p>
                            <p className="text-emerald-700 text-xs font-medium italic">Redirigiendo al login...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contraseña</Label>
                                    <Input 
                                        type="password" 
                                        required 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-12 rounded-xl border-slate-200 bg-slate-50 font-bold focus:bg-white transition-all" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirmar</Label>
                                    <Input 
                                        type="password" 
                                        required 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="h-12 rounded-xl border-slate-200 bg-slate-50 font-bold focus:bg-white transition-all" 
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in duration-300">
                                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                    <p className="text-rose-700 text-xs font-bold">{error}</p>
                                </div>
                            )}

                            <Button 
                                type="submit" 
                                disabled={loading || isValidSession === null} 
                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-blue-900/20 text-sm group"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Contraseña"}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
