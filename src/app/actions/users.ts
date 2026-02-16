'use server'

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

import { getOrganizationId } from "@/lib/current-org";
import { isAdmin } from "@/lib/permissions";

export async function createUser(formData: FormData) {
    const orgId = await getOrganizationId();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as string || 'USER';

    if (!name || !email) {
        throw new Error("Missing required fields");
    }

    const supabase = await createClient();

    // Security check: only admins can manage users
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('Profile').select('role').eq('id', user?.id).single();
    if (!isAdmin(profile?.role)) throw new Error("Acceso denegado: Se requiere rol de Administrador");

    const { error } = await supabase
        .from('Profile')
        .insert({
            id: crypto.randomUUID(), // Assuming we generate ID if not Auth managed yet
            organizationId: orgId,
            name,
            email,
            role,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });

    if (error) {
        throw new Error(`Error creating user: ${error.message}`);
    }

    revalidatePath("/settings/users");
}

export async function updateUser(userId: string, data: { name: string, role?: string }) {
    if (!userId) throw new Error("User ID is required");
    if (!data.name) throw new Error("Name is required");

    const supabase = await createClient();

    // Security check
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { data: currentProfile } = await supabase.from('Profile').select('role').eq('id', currentUser?.id).single();

    // Admins can update anyone, users can only update themselves (and only their name)
    const isEditingSelf = currentUser?.id === userId;
    if (!isAdmin(currentProfile?.role) && (!isEditingSelf || data.role)) {
        throw new Error("Acceso denegado: No tienes permisos para realizar este cambio");
    }

    const { error } = await supabase
        .from('Profile')
        .update({
            name: data.name,
            role: data.role,
            updatedAt: new Date().toISOString()
        })
        .eq('id', userId);

    if (error) {
        throw new Error(`Error updating user: ${error.message}`);
    }

    revalidatePath("/settings/users");
    revalidatePath("/settings");
    revalidatePath("/", "layout"); // Refresh layout to update header name
}

export async function deleteUser(userId: string) {
    const supabase = await createClient();

    // Security check
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { data: currentProfile } = await supabase.from('Profile').select('role').eq('id', currentUser?.id).single();
    if (!isAdmin(currentProfile?.role)) throw new Error("Acceso denegado: Se requiere rol de Administrador");

    const { error } = await supabase
        .from('Profile')
        .delete()
        .eq('id', userId);

    if (error) {
        throw new Error(`Error deleting user: ${error.message}`);
    }

    revalidatePath("/settings/users");
}
