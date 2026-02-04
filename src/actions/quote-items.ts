'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addQuoteItem(projectId: string, data: FormData) {
    const supabase = await createClient();

    const sku = data.get('sku') as string;
    const detail = data.get('detail') as string;
    const quantity = parseFloat(data.get('quantity') as string);
    const unit = data.get('unit') as string;
    const priceNet = parseFloat(data.get('priceNet') as string);
    const costNet = parseFloat(data.get('costNet') as string) || 0;

    const { error } = await supabase.from('QuoteItem').insert({
        projectId,
        sku,
        detail,
        quantity,
        unit,
        priceNet,
        costNet
    });

    if (error) {
        console.error("Error adding quote item:", error);
        throw new Error("Failed to add item");
    }

    revalidatePath(`/projects/${projectId}`);
}

export async function removeQuoteItem(itemId: string, projectId: string) {
    const supabase = await createClient();

    const { error } = await supabase.from('QuoteItem').delete().eq('id', itemId);

    if (error) {
        console.error("Error deleting quote item:", error);
        throw new Error("Failed to delete item");
    }

    revalidatePath(`/projects/${projectId}`);
}
