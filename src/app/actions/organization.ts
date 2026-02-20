'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireOperationalScope } from "@/lib/auth/server-resolver";
import { isAdmin } from "@/lib/permissions";

export async function updateOrganization(formData: FormData) {
    const supabase = await createClient();
    const scope = await requireOperationalScope();
    const orgId = scope.orgId;

    // Security check
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('Profile').select('role').eq('id', user?.id).single();
    if (!isAdmin(profile?.role)) throw new Error("Acceso denegado: Se requiere rol de Administrador");

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
