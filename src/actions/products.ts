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
    try {
        const orgId = await getOrganizationId();
        const supabase = await createClient();

        let sku = (data.get('sku') as string)?.trim();
        if (!sku) {
            let uuid;
            try { uuid = crypto.randomUUID(); } catch { uuid = Math.random().toString(36).substring(7); }
            sku = `GEN-${uuid.split('-')[0].toUpperCase()}`;
        }

        const name = data.get('name') as string;
        const description = data.get('description') as string;
        const unit = data.get('unit') as string;
        const priceNet = parseFloat(data.get('priceNet') as string) || 0;
        const costNet = parseFloat(data.get('costNet') as string) || 0;
        const type = (data.get('type') as string) || 'SERVICE';
        const minStock = parseInt(data.get('minStock') as string) || 0;
        const initialStock = parseInt(data.get('initialStock') as string) || 0;

        // Safe UUID generation
        let productId;
        try {
            productId = crypto.randomUUID();
        } catch {
            productId = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        }

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
            stock: 0,
            updatedAt: new Date().toISOString()
        });

        if (error) {
            console.error("Supabase Error creating product:", error);
            return { success: false, error: `Error DB: ${error.message} (${error.code})` };
        }

        // 2. Adjust Inventory (Assign to Default Warehouse)
        if (type === 'PRODUCT' && initialStock > 0) {
            // Get Default Location
            const { data: defaultLoc } = await supabase
                .from("Location")
                .select("id")
                .eq("organizationId", orgId)
                .eq("isDefault", true)
                .single();

            if (defaultLoc) {
                const { error: adjError } = await supabase.rpc('adjust_inventory', {
                    p_product_id: productId,
                    p_quantity: initialStock,
                    p_type: 'ADJUSTMENT',
                    p_reason: 'Inv. Inicial',
                    p_reference_id: null,
                    p_location_id: defaultLoc.id
                });
                if (adjError) console.error("Error setting initial stock:", adjError);
            } else {
                console.error("No default location found for initial stock");
            }
        }

        revalidatePath('/catalog');
        return { success: true };
    } catch (err: any) {
        console.error("createProduct Exception:", err);
        return { success: false, error: err.message || "Error inesperado en el servidor" };
    }
}

export async function updateProduct(id: string, data: FormData) {
    try {
        const supabase = await createClient();

        let sku = (data.get('sku') as string)?.trim();
        if (!sku) {
            let uuid;
            try { uuid = crypto.randomUUID(); } catch { uuid = Math.random().toString(36).substring(7); }
            sku = `GEN-${uuid.split('-')[0].toUpperCase()}`;
        }

        const name = data.get('name') as string;
        const description = data.get('description') as string;
        const unit = data.get('unit') as string;
        const priceNet = parseFloat(data.get('priceNet') as string) || 0;
        const costNet = parseFloat(data.get('costNet') as string) || 0;
        const type = (data.get('type') as string) || 'SERVICE';
        const minStock = parseInt(data.get('minStock') as string) || 0;

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
            console.error("Supabase Error updating product:", error);
            return { success: false, error: `Error DB: ${error.message} (${error.code})` };
        }

        revalidatePath('/catalog');
        return { success: true };
    } catch (err: any) {
        console.error("updateProduct Exception:", err);
        return { success: false, error: err.message || "Error inesperado en el servidor" };
    }
}

export async function deleteProduct(id: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase.from('Product').delete().eq('id', id);

        if (error) {
            console.error("Supabase Error deleting product:", error);
            return { success: false, error: `Error DB: ${error.message}` };
        }

        revalidatePath('/catalog');
        return { success: true };
    } catch (err: any) {
        console.error("deleteProduct Exception:", err);
        return { success: false, error: err.message || "Error inesperado" };
    }
}
