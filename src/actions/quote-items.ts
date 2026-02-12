'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addQuoteItem(projectId: string, data: FormData) {
    try {
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
            throw new Error(`Failed to add item: ${error.message}`);
        }

        // Audit
        await AuditService.logAction(projectId, 'ADD_ITEM', `Added item: ${detail} (${quantity} ${unit}) - $${priceNet}`);

        revalidatePath(`/projects/${projectId}`);
    } catch (error) {
        console.error("Critical error in addQuoteItem:", error);
        throw error;
    }
}

import { AuditService } from "@/services/auditService";

export async function removeQuoteItem(itemId: string, projectId: string) {
    try {
        const supabase = await createClient();

        // 1. Delete Item
        const { error } = await supabase.from('QuoteItem').delete().eq('id', itemId);

        if (error) {
            console.error("Error deleting quote item:", error);
            throw new Error(`Failed to delete item: ${error.message}`);
        }

        // 2. Audit (Safe logging)
        await AuditService.logAction(projectId, 'DELETE_ITEM', `Deleted item ID: ${itemId}`);

        revalidatePath(`/projects/${projectId}`);
    } catch (error) {
        console.error("Critical error in removeQuoteItem:", error);
        throw error; // Let the client handle it, but now with better logging
    }
}

export async function updateQuoteItem(itemId: string, projectId: string, data: FormData) {
    try {
        const supabase = await createClient();

        const sku = data.get('sku') as string;
        const detail = data.get('detail') as string;
        const quantity = parseFloat(data.get('quantity') as string);
        const unit = data.get('unit') as string;
        const priceNet = parseFloat(data.get('priceNet') as string);
        const costNet = parseFloat(data.get('costNet') as string) || 0;

        const { error } = await supabase.from('QuoteItem').update({
            sku,
            detail,
            quantity,
            unit,
            priceNet,
            costNet
        }).eq('id', itemId);

        if (error) {
            console.error("Error updating quote item:", error);
            throw new Error(`Failed to update item: ${error.message}`);
        }

        // Audit
        await AuditService.logAction(projectId, 'UPDATE_ITEM', `Updated item: ${detail} (${quantity} ${unit}) - $${priceNet}`);

        revalidatePath(`/projects/${projectId}`);
        revalidatePath(`/projects/${projectId}/quote`);
    } catch (error) {
        console.error("Critical error in updateQuoteItem:", error);
        throw error;
    }
}

export async function toggleQuoteItemSelection(itemId: string, projectId: string, isSelected: boolean) {
    try {
        const supabase = await createClient();

        const { error } = await supabase.from('QuoteItem').update({
            isSelected
        }).eq('id', itemId);

        if (error) {
            console.error("Error toggling item selection:", error);
            throw new Error(`Failed to toggle selection: ${error.message}`);
        }

        revalidatePath(`/projects/${projectId}`);
    } catch (error) {
        console.error("Critical error in toggleQuoteItemSelection:", error);
        throw error;
    }
}

export async function toggleAllQuoteItems(projectId: string, isSelected: boolean) {
    try {
        const supabase = await createClient();

        const { error } = await supabase.from('QuoteItem').update({
            isSelected
        }).eq('projectId', projectId);

        if (error) {
            console.error("Error toggling all items:", error);
            throw new Error(`Failed to toggle all items: ${error.message}`);
        }

        revalidatePath(`/projects/${projectId}`);
    } catch (error) {
        console.error("Critical error in toggleAllQuoteItems:", error);
        throw error;
    }
}
