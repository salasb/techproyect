'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getOrganizationId } from "@/lib/current-org";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";

export type InventoryMovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'SALE' | 'PURCHASE' | 'TRANSFER';

export async function adjustStock(
    productId: string,
    quantity: number,
    type: InventoryMovementType,
    fromLocationId?: string,
    toLocationId?: string,
    reason?: string,
    referenceId?: string
) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
    const supabase = await createClient();

    // Validate Stock for Outgoing Movements
    if (['OUT', 'SALE', 'TRANSFER'].includes(type) && fromLocationId) {
        const { data: stockInfo } = await supabase
            .from('ProductStock')
            .select('quantity')
            .eq('productId', productId)
            .eq('locationId', fromLocationId)
            .single();

        const currentQty = stockInfo?.quantity || 0;
        if (currentQty < quantity) {
            return { error: `Stock insuficiente en origen. Disponible: ${currentQty}, Solicitado: ${quantity}` };
        }
    }

    try {
        const { error } = await supabase.rpc('register_inventory_movement', {
            p_product_id: productId,
            p_quantity: quantity,
            p_type: type,
            p_from_location_id: fromLocationId || null,
            p_to_location_id: toLocationId || null,
            p_notes: reason || null,
            p_reference: referenceId || null
        });

        if (error) {
            console.error("Error adjusting inventory:", error);
            return { error: error.message };
        }

        revalidatePath('/catalog');
        revalidatePath(`/catalog/${productId}`);
        revalidatePath('/inventory/locations');
        return { success: true };
    } catch (e) {
        console.error("Unexpected error:", e);
        return { error: "Unexpected error" };
    }
}

export async function getKardex(productId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('InventoryMovement')
        .select(`
            *,
            fromLocation:Location!InventoryMovement_fromLocationId_fkey(name),
            toLocation:Location!InventoryMovement_toLocationId_fkey(name),
            user:Profile!InventoryMovement_userId_fkey(name)
        `)
        .eq('productId', productId)
        .order('createdAt', { ascending: false });

    if (error) {
        console.error("Error fetching kardex:", error);
        return { error: error.message };
    }

    return { data };
}
