'use server'

import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/current-org";
import { revalidatePath } from "next/cache";

export async function createLocation(data: { name: string; address?: string }) {
    const supabase = await createClient();
    const orgId = await getOrganizationId();

    if (!orgId) return { error: "No organization found" };

    const { error } = await supabase
        .from("Location")
        .insert({
            organizationId: orgId,
            name: data.name,
            address: data.address,
            type: 'WAREHOUSE',
            status: 'ACTIVE'
        });

    if (error) {
        console.error("Error creating location", error);
        return { error: "Error al crear ubicación" };
    }

    revalidatePath("/locations");
    return { success: true };
}
