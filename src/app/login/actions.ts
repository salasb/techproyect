'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function translateAuthError(errorMessage: string): string {
    const error = errorMessage.toLowerCase()

    if (error.includes('invalid login credentials')) {
        return 'Credenciales incorrectas. Por favor verifica tu correo y contraseña.'
    }
    if (error.includes('email rate limit exceeded')) {
        return 'Has realizado demasiados intentos. Por favor espera unos minutos antes de intentar de nuevo.'
    }
    if (error.includes('user already registered')) {
        return 'Este correo ya está registrado. Intenta iniciar sesión.'
    }
    if (error.includes('password should be at least')) {
        return 'La contraseña es muy corta. Debe tener al menos 6 caracteres.'
    }
    if (error.includes('anonymous provider is disabled')) {
        return 'El acceso anónimo está desactivado.'
    }
    if (error.includes('email not confirmed')) {
        return 'El correo no ha sido confirmado. (Ya lo hemos validado manualmente, intenta ingresar de nuevo).'
    }

    // Fallback for unknown errors
    return `Error del sistema: ${errorMessage}`
}

export async function login(formData: FormData) {
    const supabase = await createClient()

    // Type-casting here for convenience
    // In a production app, you might want to validate these
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
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

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    })

    if (error) {
        return { error: translateAuthError(error.message) }
    }

    if (data.session) {
        revalidatePath('/', 'layout')
        redirect('/dashboard')
    }

    return {
        success: true,
        message: '¡Cuenta creada con éxito! Por favor revisa tu correo electrónico para confirmar tu cuenta y poder ingresar.'
    }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()

    revalidatePath('/login', 'layout')
    redirect('/login')
}
