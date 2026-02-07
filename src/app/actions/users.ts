'use server'

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createUser(formData: FormData) {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as string || 'USER';

    if (!name || !email) {
        throw new Error("Missing required fields");
    }

    const supabase = await createClient();

    const { error } = await supabase
        .from('Profile')
        .insert({
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

    const { error } = await supabase
        .from('Profile')
        .delete()
        .eq('id', userId);

    if (error) {
        throw new Error(`Error deleting user: ${error.message}`);
    }

    revalidatePath("/settings/users");
}
