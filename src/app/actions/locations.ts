'use server'

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/current-org";
import { AuditService } from "@/services/auditService";
import { validateAuthorization } from "@/lib/auth/validateAuthorization";

export async function getLocations() {
    const orgId = await getOrganizationId();
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('Location')
        .select(`
            *,
            members:LocationMember(
                userId,
                role,
                profile:Profile(name, email)
            )
        `)
        .eq('organizationId', orgId)
        .order('createdAt', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
}

export async function createLocation(formData: FormData) {
    await validateAuthorization(['ADMIN', 'SUPERADMIN']); // Only admins manage locations

    const orgId = await getOrganizationId();
    const supabase = await createClient();

    const name = formData.get('name') as string;
    const address = formData.get('address') as string;
    const type = formData.get('type') as 'WAREHOUSE' | 'VEHICLE' | 'SITE';

    const { data, error } = await supabase
        .from('Location')
        .insert({
            name,
            address,
            type,
            organizationId: orgId,
            status: 'ACTIVE'
        })
        .select()
        .single();

    if (error) throw new Error(`Error creando ubicación: ${error.message}`);

    await AuditService.logAction(null, 'LOCATION_CREATE', `Ubicación creada: ${name} (${type})`);

    revalidatePath('/inventory/locations');
    return { success: true, location: data };
}

export async function updateLocation(locationId: string, formData: FormData) {
    await validateAuthorization(['ADMIN', 'SUPERADMIN']);

    const supabase = await createClient();

    const name = formData.get('name') as string;
    const address = formData.get('address') as string;
    const type = formData.get('type') as 'WAREHOUSE' | 'VEHICLE' | 'SITE';

    const { error } = await supabase
        .from('Location')
        .update({
            name,
            address,
            type,
            updatedAt: new Date().toISOString()
        })
        .eq('id', locationId);

    if (error) throw new Error(`Error actualizando ubicación: ${error.message}`);

    await AuditService.logAction(null, 'LOCATION_UPDATE', `Ubicación actualizada: ${name}`);

    revalidatePath('/inventory/locations');
    return { success: true };
}

export async function deleteLocation(locationId: string) {
    await validateAuthorization(['ADMIN', 'SUPERADMIN']);
    const supabase = await createClient();

    // Check for stock
    const { count } = await supabase
        .from('ProductStock')
        .select('*', { count: 'exact', head: true })
        .eq('locationId', locationId)
        .gt('quantity', 0);

    if (count && count > 0) {
        throw new Error("No se puede eliminar una ubicación con stock activo. Transfiera los productos primero.");
    }

    const { error } = await supabase.from('Location').delete().eq('id', locationId);

    if (error) throw new Error(error.message);

    await AuditService.logAction(null, 'LOCATION_DELETE', `Ubicación eliminada: ${locationId}`);
    revalidatePath('/inventory/locations');
    return { success: true };
}
