'use client';

import { useState } from 'react';
import { completeRegistration } from "@/app/actions/register";
import { Loader2, ArrowRight, Lock, User, Mail, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
    token: string;
    email: string; // Pre-filled from token validation
}

export function RegisterForm({ token, email }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        try {
            // Append token explicitly if not in form (it is hidden input)
            const result = await completeRegistration(formData);

            if (result?.error) {
                setError(result.error);
            } else {
                // Success
                // Actually completeRegistration redirects on session, so we might not reach here if successful
                // But if it returns success message (email confirm needed), show it
                if (result?.message) {
                    alert(result.message); // Simple alert for now
                    router.push('/login');
                }
            }
        } catch (e: any) {
            setError(e.message || "Error desconocido");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-8">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Completa tu perfil</h3>
                <p className="text-sm text-zinc-500">Configura tu acceso para {email}</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    {error}
                </div>
            )}

            <form action={handleSubmit} className="space-y-4">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="email" value={email} />

                <div className="space-y-4">
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                        <input
                            name="fullName"
                            type="text"
                            required
                            placeholder="Nombre Completo"
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-400 opacity-50" />
                        <input
                            disabled
                            value={email}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 cursor-not-allowed"
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                        <input
                            name="password"
                            type="password"
                            required
                            placeholder="Contraseña"
                            minLength={6}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
                >
                    {isLoading ? <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" /> : 'Crear Cuenta'}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </button>
            </form>
        </div>
    );
}
