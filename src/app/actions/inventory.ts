'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type InventoryMovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'SALE' | 'PURCHASE';

export async function adjustStock(
    productId: string,
    quantity: number,
    type: InventoryMovementType,
    reason?: string,
    referenceId?: string
) {
    const supabase = await createClient();

    try {
        const { error } = await supabase.rpc('adjust_inventory', {
            p_product_id: productId,
            p_quantity: quantity,
            p_type: type,
            p_reason: reason || null,
            p_reference_id: referenceId || null
        });

        if (error) {
            console.error("Error adjusting inventory:", error);
            return { error: error.message };
        }

        revalidatePath('/catalog'); // Or wherever products are listed
        revalidatePath(`/catalog/${productId}`);
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
        .select('*')
        .eq('productId', productId)
        .order('createdAt', { ascending: false });

    if (error) {
        console.error("Error fetching kardex:", error);
        return { error: error.message };
    }

    return { data };
}
