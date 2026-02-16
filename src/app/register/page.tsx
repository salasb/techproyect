import { RegisterForm } from '@/components/auth/RegisterForm';
import Link from 'next/link';
import { validateInvitationToken } from '@/app/actions/register';
import { AlertCircle } from 'lucide-react';

export default async function RegisterPage({
    searchParams,
}: {
    searchParams: { token?: string }
}) {
    const token = searchParams.token;

    // Server-side validation
    // cast to string or empty to satisfy type, validation function handles empty check
    const validation = await validateInvitationToken(token || '');

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-black p-4">
            <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-600 text-white mb-4 shadow-lg shadow-green-500/30">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Únete a TechProyect
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                    Completa tu registro para acceder a la organización
                </p>
            </div>

            {!validation.valid ? (
                <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-red-200 p-8 text-center">
                    <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-red-900 mb-2">Enlace inválido o expirado</h3>
                    <p className="text-sm text-red-600 mb-6">{validation.error}</p>
                    <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                        Volver al inicio
                    </Link>
                </div>
            ) : (
                <RegisterForm token={token!} email={validation.email!} />
            )}

            <div className="mt-6 text-center text-sm">
                <span className="text-gray-500 dark:text-zinc-500">
                    ¿Ya tienes cuenta?{' '}
                </span>
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                    Iniciar sesión
                </Link>
            </div>

            <p className="mt-8 text-xs text-center text-gray-500 dark:text-zinc-500">
                © {new Date().getFullYear()} TechProyect Inc. Todos los derechos reservados.
            </p>
        </div>
    )
}
