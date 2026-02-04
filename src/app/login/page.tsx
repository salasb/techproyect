import { LoginForm } from '@/components/auth/LoginForm'
import Image from 'next/image'

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-black p-4">
            <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-500/30">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    TechProyect
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                    Gestión inteligente de cotizaciones y proyectos
                </p>
            </div>

            <LoginForm />

            <p className="mt-8 text-xs text-center text-gray-500 dark:text-zinc-500">
                © {new Date().getFullYear()} TechProyect Inc. Todos los derechos reservados.
            </p>
        </div>
    )
}
