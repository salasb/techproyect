'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ActivationService } from '@/services/activation-service'
import { getURL } from '@/lib/auth/utils'
import { getWorkspaceState } from '@/lib/auth/workspace-resolver'
import { resolveAccessContext } from '@/lib/auth/access-resolver'

/**
 * Enhanced Error Translator for better Auth UX and debugging
 */
function translateAuthError(errorMessage: string, status: number = 0, type: 'login' | 'signup' | 'reset' = 'login'): string {
    const error = errorMessage.toLowerCase()
    
    // 1. Explicit Infrastructure / Config Errors
    if (status === 429 || error.includes('rate limit')) {
        return 'Demasiados intentos. Por favor espera unos minutos antes de intentar de nuevo.'
    }
    
    if (error.includes('redirect_uri_not_allowed')) {
        return 'Error de configuración en el servidor (Redirect URI). Contacta a soporte.'
    }

    if (error.includes('email_not_confirmed') || error.includes('not confirmed')) {
        return 'Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada.'
    }

    // 2. Specific Action Errors
    if (type === 'login') {
        if (error.includes('invalid login credentials') || error.includes('user not found')) {
            return 'El correo o la contraseña son incorrectos.'
        }
    }

    if (type === 'signup') {
        if (error.includes('user already registered')) {
            return 'Esta cuenta ya existe. Intenta iniciar sesión o recuperar tu clave.'
        }
    }
    
    if (error.includes('password should be at least')) {
        return 'La contraseña debe tener al menos 6 caracteres.'
    }

    // 3. Generic Fallback (Secure)
    return 'Ocurrió un problema con la autenticación. Intenta nuevamente.'
}

export async function login(formData: FormData) {
    const traceId = `LOG-${Math.random().toString(36).substring(7).toUpperCase()}`
    const supabase = await createClient()
    const rawEmail = formData.get('email') as string
    const password = formData.get('password') as string
    const email = rawEmail.trim().toLowerCase()

    console.log(`[AUTH][${traceId}] Attempting login for: ${email}`)

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        console.warn(`[AUTH][${traceId}] Login failed for ${email}: ${error.message} (Status: ${error.status})`);
        return { error: translateAuthError(error.message, error.status || 0, 'login'), traceId }
    }

    // After successful login, resolve canonical route
    const context = await resolveAccessContext();
    
    console.log(`[AUTH][${traceId}] Login success for ${email}. Mode: ${context.effectiveMode}, GlobalRole: ${context.globalRole}`);

    if (context.activeOrgId) {
        await ActivationService.trackFunnelEvent('PORTAL_LOGIN_SUCCESS', context.activeOrgId, `login_${context.userId}_${Date.now()}`, context.userId!);
    }

    revalidatePath('/', 'layout')

    // RULE: Global operators land in /admin by default
    if (context.isGlobalOperator) {
        redirect('/admin');
    }

    // Default: land in recommended tenant route
    const state = await getWorkspaceState();
    redirect(state.recommendedRoute);
}

export async function signup(formData: FormData) {
    const traceId = `REG-${Math.random().toString(36).substring(7).toUpperCase()}`
    const supabase = await createClient()
    const rawEmail = formData.get('email') as string
    const password = formData.get('password') as string
    const email = rawEmail.trim().toLowerCase()

    console.log(`[AUTH][${traceId}] Attempting signup for: ${email}`)

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    })

    if (error) {
        console.error(`[AUTH][${traceId}] Signup Error: ${error.message} (Status: ${error.status})`)
        return { error: translateAuthError(error.message, error.status || 0, 'signup'), traceId }
    }

    if (data.session) {
        const state = await getWorkspaceState();
        revalidatePath('/', 'layout')
        redirect(state.recommendedRoute);
    }

    return {
        success: true,
        traceId,
        message: 'Si los datos son válidos, hemos enviado un correo de confirmación. Revisa tu bandeja de entrada.'
    }
}

export async function forgotPassword(formData: FormData) {
    const traceId = `REC-${Math.random().toString(36).substring(7).toUpperCase()}`
    const supabase = await createClient()
    const rawEmail = formData.get('email') as string
    const email = rawEmail.trim().toLowerCase()
    
    const redirectTo = getURL('/auth/update-password')
    console.log(`[AUTH][${traceId}] Recovery request for: ${email} (RedirectTo: ${redirectTo})`)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
    })

    if (error) {
        console.error(`[AUTH][${traceId}] Reset Error: ${error.message} (Status: ${error.status})`)
        return { 
            error: translateAuthError(error.message, error.status || 0, 'reset'),
            traceId 
        }
    }

    return {
        success: true,
        traceId,
        message: 'Si el correo es válido, recibirás un enlace en breve. Revisa Spam y espera 2 minutos.'
    }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()

    revalidatePath('/login', 'layout')
    redirect('/login')
}
