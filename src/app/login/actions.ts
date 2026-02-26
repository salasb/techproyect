'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function translateAuthError(errorMessage: string, type: 'login' | 'signup' | 'reset' = 'login'): string {
    const error = errorMessage.toLowerCase()
    console.log(`[AUTH DEBUG] Error real (${type}): ${errorMessage}`)

    if (type === 'login') {
        // Anti-enumeration: same message for wrong password or non-existent user
        if (error.includes('invalid login credentials') || error.includes('user not found')) {
            return 'Correo o contraseña incorrectos.'
        }
    }

    if (type === 'signup') {
        if (error.includes('user already registered')) {
            return 'No pudimos crear la cuenta con esos datos.'
        }
    }

    if (error.includes('email rate limit exceeded')) {
        return 'Demasiados intentos. Por favor espera unos minutos.'
    }
    
    if (error.includes('password should be at least')) {
        return 'La contraseña debe tener al menos 6 caracteres.'
    }

    if (error.includes('email not confirmed')) {
        return 'Tu correo aún no ha sido verificado.'
    }

    // Generic fallback for any other error
    return 'Ocurrió un error en el proceso. Inténtalo de nuevo.'
}

export async function login(formData: FormData) {
    const supabase = await createClient()

    const rawEmail = formData.get('email') as string
    const password = formData.get('password') as string

    // UX Validation & Normalization
    const email = rawEmail.trim().toLowerCase()

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: translateAuthError(error.message, 'login') }
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const { data: profile } = await supabase
            .from('Profile')
            .select('role')
            .eq('id', user.id)
            .single();

        revalidatePath('/', 'layout')

        if (profile?.role === 'SUPERADMIN') {
            redirect('/admin')
        } else {
            redirect('/dashboard')
        }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const rawEmail = formData.get('email') as string
    const password = formData.get('password') as string
    
    // UX Normalization
    const email = rawEmail.trim().toLowerCase()

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    })

    if (error) {
        return { error: translateAuthError(error.message, 'signup') }
    }

    if (data.session) {
        revalidatePath('/', 'layout')
        redirect('/dashboard')
    }

    return {
        success: true,
        message: 'Si los datos son válidos, hemos enviado un correo de confirmación.'
    }
}

export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()
    const rawEmail = formData.get('email') as string
    const email = rawEmail.trim().toLowerCase()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/settings/profile`,
    })

    if (error) {
        console.error(`[AUTH ERROR] resetPassword: ${error.message}`)
    }

    // Anti-enumeration: always return success
    return {
        success: true,
        message: 'Si el correo está registrado, te enviaremos un enlace para restablecer tu contraseña.'
    }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()

    revalidatePath('/login', 'layout')
    redirect('/login')
}
