'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function validateInvitationToken(token: string) {
    if (!token) return { valid: false, error: "No token provided" };

    const supabase = await createClient();

    // Check if token exists, is not accepted, and is not expired
    const { data, error } = await supabase
        .from('UserInvitation')
        .select('*')
        .eq('token', token)
        .is('acceptedAt', null)
        .gt('expiresAt', new Date().toISOString())
        .single();

    if (error || !data) {
        return { valid: false, error: "Invitación inválida o expirada" };
    }

    return { valid: true, email: data.email, role: data.role, organizationId: data.organizationId };
}

export async function completeRegistration(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const token = formData.get('token') as string;

    if (!email || !password || !fullName || !token) {
        return { error: "Todos los campos son requeridos" };
    }

    // Double check token validity before proceeding (security)
    const validation = await validateInvitationToken(token);
    if (!validation.valid) {
        return { error: validation.error };
    }

    // Sign Up
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                // We could pass organizationId here to metadata, but the trigger handles it safer
            }
        }
    });

    if (authError) {
        return { error: authError.message };
    }

    // The 'handle_new_user' trigger should have run by now and linked the profile/org
    // based on the verified email in 'UserInvitation'.

    // We can auto-login? supabase.auth.signUp usually returns session if email confirmation is disabled.
    // usage of 'revalidatePath' might not affect client auth state directly without a proper flow.

    if (authData.session) {
        revalidatePath('/', 'layout');
        redirect('/dashboard');
    } else {
        return {
            success: true,
            message: "¡Cuenta creada con éxito! Por favor revisa tu correo electrónico para confirmar tu cuenta y activar tu perfil."
        };
    }
}
