'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getProducts(query?: string) {
    const supabase = await createClient();
    let q = supabase.from('Product').select('*').order('name');

    if (query) {
        q = q.or(`name.ilike.%${query}%,sku.ilike.%${query}%`);
    }

    const { data, error } = await q;

    if (error) {
        console.error("Error fetching products:", error);
        return [];
    }

    return data;
}

import { getOrganizationId } from "@/lib/current-org";

export async function createProduct(data: FormData) {
    const orgId = await getOrganizationId();
    const supabase = await createClient();

    let sku = (data.get('sku') as string)?.trim();
    if (!sku) {
        // Auto-generate SKU if missing to satisfy DB constraints (assuming NOT NULL UNIQUE)
        sku = `GEN-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    }

    const name = data.get('name') as string;
    const description = data.get('description') as string;
    const unit = data.get('unit') as string;
    const priceNet = parseFloat(data.get('priceNet') as string) || 0;
    const costNet = parseFloat(data.get('costNet') as string) || 0;
    const type = (data.get('type') as string) || 'SERVICE';
    const minStock = parseInt(data.get('minStock') as string) || 0;
    const initialStock = parseInt(data.get('initialStock') as string) || 0;

    const productId = crypto.randomUUID();

    // 1. Create Product (Stock 0 initially)
    const { error } = await supabase.from('Product').insert({
        id: productId,
        organizationId: orgId,
        sku,
        name,
        description,
        unit,
        priceNet,
        costNet,
        type,
        min_stock: minStock,
        stock: 0 // Always 0, adjusted via RPC below
    });

    if (error) {
        console.error("Supabase Error creating product:", error);
        throw new Error(`Error al crear producto: ${error.message} (${error.code})`);
    }

    // 2. If Initial Stock > 0 and Type is PRODUCT, Adjust Inventory
    if (type === 'PRODUCT' && initialStock > 0) {
        const { error: adjError } = await supabase.rpc('adjust_inventory', {
            p_product_id: productId,
            p_quantity: initialStock,
            p_type: 'ADJUSTMENT',
            p_reason: 'Inv. Inicial',
            p_reference_id: null
        });

        if (adjError) {
            console.error("Error setting initial stock:", adjError);
            // We don't fail the whole creation, but log it. 
            // Ideally we should rollback, but RPC is separate tx here if not using exact same client connection string in raw sql.
        }
    }

    revalidatePath('/catalog');
}

export async function updateProduct(id: string, data: FormData) {
    const supabase = await createClient();

    let sku = (data.get('sku') as string)?.trim();
    if (!sku) {
        sku = `GEN-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    }

    const name = data.get('name') as string;
    const description = data.get('description') as string;
    const unit = data.get('unit') as string;
    const priceNet = parseFloat(data.get('priceNet') as string) || 0;
    const costNet = parseFloat(data.get('costNet') as string) || 0;
    const type = (data.get('type') as string) || 'SERVICE';
    const minStock = parseInt(data.get('minStock') as string) || 0;
    // Stock is NOT updated here directly.

    const { error } = await supabase.from('Product').update({
        sku,
        name,
        description,
        unit,
        priceNet,
        costNet,
        type,
        min_stock: minStock,
        updatedAt: new Date().toISOString()
    }).eq('id', id);

    if (error) {
        throw new Error(`Error updating product: ${error.message}`);
    }

    revalidatePath('/catalog');
}

export async function deleteProduct(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('Product').delete().eq('id', id);

    if (error) {
        throw new Error(`Error deleting product: ${error.message}`);
    }

    revalidatePath('/catalog');
}
