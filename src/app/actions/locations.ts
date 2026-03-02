'use server'

import { createClient } from "@/lib/supabase/server";
import { requireOperationalScope, requirePermission } from "@/lib/auth/server-resolver";
import { revalidatePath } from "next/cache";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";

export async function createLocation(data: { name: string; address?: string; type?: string }) {
    const scope = await requirePermission('INVENTORY_MANAGE');
    const orgId = scope.orgId;
    await ensureNotPaused(orgId);
    const supabase = await createClient();

    if (!orgId) return { error: "No organization found" };

    const { error } = await supabase
        .from("Location")
        .insert({
            organizationId: orgId,
            name: data.name,
            address: data.address,
            type: data.type || 'WAREHOUSE',
            status: 'ACTIVE'
        });

    if (error) {
        console.error("Error creating location", error);
        return { error: "Error al crear ubicación" };
    }

    revalidatePath("/inventory/locations");
    return { success: true };
}

export async function getLocations() {
    const supabase = await createClient();
    const scope = await requireOperationalScope();
    const orgId = scope.orgId;

    if (!orgId) return [];

    const { data } = await supabase
        .from("Location")
        .select("*")
        .eq("organizationId", orgId)
        .order("name");

    return data || [];
}

export async function updateLocation(id: string, data: { name: string; address?: string; type?: string }) {
    const scope = await requirePermission('INVENTORY_MANAGE');
    const supabase = await createClient();

    const { error } = await supabase
        .from("Location")
        .update({
            name: data.name,
            address: data.address,
            type: data.type
        })
        .eq('id', id)
        .eq('organizationId', scope.orgId);

    if (error) return { error: error.message };
    revalidatePath("/inventory/locations");
    return { success: true };
}

export async function deleteLocation(id: string) {
    const scope = await requirePermission('INVENTORY_MANAGE');
    const supabase = await createClient();

    const { error } = await supabase
        .from("Location")
        .delete()
        .eq('id', id)
        .eq('organizationId', scope.orgId);

    if (error) return { error: error.message };
    revalidatePath("/inventory/locations");
    return { success: true };
}
