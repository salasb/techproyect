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

export async function createProduct(data: FormData) {
    const supabase = await createClient();

    const sku = data.get('sku') as string;
    const name = data.get('name') as string;
    const description = data.get('description') as string;
    const unit = data.get('unit') as string;
    const priceNet = parseFloat(data.get('priceNet') as string) || 0;
    const costNet = parseFloat(data.get('costNet') as string) || 0;

    const { error } = await supabase.from('Product').insert({
        sku,
        name,
        description,
        unit,
        priceNet,
        costNet
    });

    if (error) {
        throw new Error(`Error creating product: ${error.message}`);
    }

    revalidatePath('/catalog');
}

export async function updateProduct(id: string, data: FormData) {
    const supabase = await createClient();

    const sku = data.get('sku') as string;
    const name = data.get('name') as string;
    const description = data.get('description') as string;
    const unit = data.get('unit') as string;
    const priceNet = parseFloat(data.get('priceNet') as string) || 0;
    const costNet = parseFloat(data.get('costNet') as string) || 0;

    const { error } = await supabase.from('Product').update({
        sku,
        name,
        description,
        unit,
        priceNet,
        costNet,
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
