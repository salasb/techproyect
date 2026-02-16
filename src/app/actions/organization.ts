'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getOrganizationId } from "@/lib/current-org";

export async function updateOrganization(formData: FormData) {
    const supabase = await createClient();
    const orgId = await getOrganizationId();

    const name = formData.get("name") as string;
    const rut = formData.get("rut") as string;
    const logoUrl = formData.get("logoUrl") as string;

    const { error } = await supabase
        .from('Organization')
        .update({
            name,
            rut,
            logoUrl,
            updatedAt: new Date().toISOString()
        })
        .eq('id', orgId);

    if (error) {
        throw new Error(`Error updating organization: ${error.message}`);
    }

    revalidatePath('/settings/organization');
    revalidatePath('/settings'); // Might affect header if name changes
}
