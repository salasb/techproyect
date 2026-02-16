'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Updates the activation status of an organization.
 */
export async function updateOrganizationStatus(orgId: string, status: 'PENDING' | 'ACTIVE' | 'INACTIVE') {
    const supabase = await createClient();

    // Safety check: ensure only SUPERADMIN can do this
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase.from("Profile").select("role").eq("id", user.id).single();
    if (profile?.role !== "SUPERADMIN") throw new Error("Forbidden: Admin access required");

    const { error } = await supabase
        .from('Organization')
        .update({ status, updatedAt: new Date().toISOString() })
        .eq('id', orgId);

    if (error) {
        console.error("Error updating org status:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/orgs');
    return { success: true };
}

/**
 * Updates the subscription plan of an organization.
 */
export async function updateOrganizationPlan(orgId: string, plan: 'FREE' | 'PRO' | 'ENTERPRISE') {
    const supabase = await createClient();

    // Role check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { data: profile } = await supabase.from("Profile").select("role").eq("id", user.id).single();
    if (profile?.role !== "SUPERADMIN") throw new Error("Forbidden");

    const { error } = await supabase
        .from('Organization')
        .update({ plan, updatedAt: new Date().toISOString() })
        .eq('id', orgId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/orgs');
    return { success: true };
}

/**
 * Updates a user's role globally.
 */
export async function updateUserRole(userId: string, role: string) {
    const supabase = await createClient();

    // Safety check: ensure only SUPERADMIN can do this
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase.from("Profile").select("role").eq("id", user.id).single();
    if (profile?.role !== "SUPERADMIN") throw new Error("Forbidden: Admin access required");

    const { error } = await supabase
        .from('Profile')
        .update({ role, updatedAt: new Date().toISOString() })
        .eq('id', userId);

    if (error) {
        console.error("Error updating user role:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/users');
    return { success: true };
}
