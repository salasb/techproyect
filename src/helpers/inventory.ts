
import { createClient } from "@/lib/supabase/server";
import { adjustStock } from "@/app/actions/inventory";

export async function deductStockForProject(projectId: string) {
    const supabase = await createClient();

    // 1. Check if we already deducted stock for this project
    // We look for ANY movement referencing this project ID
    const { data: existingMovements, error: checkError } = await supabase
        .from('InventoryMovement')
        .select('id')
        .eq('referenceId', projectId)
        .limit(1);

    if (checkError) {
        console.error("Error checking existing movements:", checkError);
        return { success: false, error: "Database error checking movements" };
    }

    if (existingMovements && existingMovements.length > 0) {
        console.log(`Stock already deducted for project ${projectId}. Skipping.`);
        return { success: true, skipped: true }; // Business success (idempotent)
    }

    // 2. Fetch Project Items
    const { data: items, error: itemsError } = await supabase
        .from('QuoteItem')
        .select('sku, quantity, detail')
        .eq('projectId', projectId);

    if (itemsError || !items) {
        console.error("Error fetching quote items:", itemsError);
        return { success: false, error: "Failed to fetch project items" };
    }

    // 3. Process each item
    let deductionCount = 0;
    const errors = [];

    for (const item of items) {
        if (!item.sku || !item.quantity || item.quantity <= 0) continue;

        // Find the Product by SKU (Scoped to Organization? Yes, implicit in RLS but strict check good)
        const { data: product } = await supabase
            .from('Product')
            .select('id, type, name')
            .eq('sku', item.sku)
            .single();

        if (!product) {
            console.warn(`SKU ${item.sku} not found in Products. Skipping.`);
            continue;
        }

        if (product.type !== 'PRODUCT') {
            continue; // Services don't track stock
        }

        // 4. Deduct Stock
        // We use negative quantity for OUT
        const result = await adjustStock(
            product.id,
            -item.quantity,
            'SALE',
            `Proyecto: ${projectId} (Item: ${item.detail})`,
            projectId
        );

        if (result.error) {
            errors.push(`Failed to deduct ${item.sku}: ${result.error}`);
        } else {
            deductionCount++;
        }
    }

    return {
        success: errors.length === 0,
        deducted: deductionCount,
        errors: errors.length > 0 ? errors : undefined
    };
}
