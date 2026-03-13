import { LoginForm } from '@/components/auth/LoginForm'
import { resolveSessionContext } from '@/lib/auth/session-resolver'
import { Button } from '@/components/ui/button'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function LoginPage() {
    const session = await resolveSessionContext();

    // Reconstruct Context Action
    async function continueToApp() {
        'use server';
        const ctx = await resolveSessionContext();
        if (!ctx.isAuthenticated) {
            redirect('/login');
        }
        if (ctx.globalRole === 'SUPERADMIN' || ctx.globalRole === 'STAFF') {
            redirect('/admin');
        }
        if (ctx.activeOrgId) {
            redirect('/dashboard');
        }
        redirect('/start');
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-black p-4">
            <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-500/30">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white italic uppercase tracking-tighter">
                    TechWise <span className="text-blue-600">Pro</span>
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400 font-medium italic">
                    Centro de Operaciones Comerciales
                </p>
            </div>

            {session.isAuthenticated ? (
                <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 dark:border-zinc-800 text-center space-y-6 animate-in zoom-in duration-500">
                    <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-black uppercase tracking-tight">Sesión Activa</h2>
                        <p className="text-sm text-muted-foreground italic font-medium">Autenticado como <br/><span className="text-foreground font-bold">{session.email}</span></p>
                    </div>
                    
                    <form action={continueToApp}>
                        <Button type="submit" className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-900/20 transition-all">
                            Entrar de Forma Segura
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </form>

                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                            ¿No eres tú o quieres cambiar de cuenta? <br/><Link href="/logout" className="text-blue-600 hover:underline mt-1 inline-block">Cerrar Sesión Segura</Link>
                        </p>
                    </div>
                </div>
            ) : (
                <LoginForm />
            )}

            <p className="mt-8 text-xs text-center text-gray-500 dark:text-zinc-500 font-medium italic opacity-50 uppercase tracking-widest">
                © {new Date().getFullYear()} TechWise. Powering Business Operations.
            </p>
        </div>
    )
}
