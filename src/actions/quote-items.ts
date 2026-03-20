'use server'

import { revalidatePath } from "next/cache";
import { requireOperationalScope, requirePermission } from "@/lib/auth/server-resolver";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import { AuditService } from "@/services/auditService";
import prisma from "@/lib/prisma";

export async function addQuoteItem(projectId: string, data: FormData) {
    const traceId = `ITM-ADD-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const scope = await requirePermission('QUOTES_MANAGE');
        await ensureNotPaused(scope.orgId);

        const sku = data.get('sku') as string || '';
        const detail = data.get('detail') as string;
        const quantity = parseFloat(data.get('quantity') as string) || 1;
        const unit = data.get('unit') as string || 'UN';
        const priceNet = parseFloat(data.get('priceNet') as string) || 0;
        const costNet = parseFloat(data.get('costNet') as string) || 0;

        console.log(`[QuoteItems][${traceId}] Adding item to project=${projectId}, org=${scope.orgId}`);

        const newItem = await prisma.quoteItem.create({
            data: {
                id: Math.random().toString(36).substring(2, 10),
                organizationId: scope.orgId,
                projectId,
                sku,
                detail,
                quantity,
                unit,
                priceNet,
                costNet,
                isSelected: true
            }
        });

        // Audit
        await AuditService.logAction({
            projectId: projectId,
            action: 'ADD_ITEM',
            details: `Added item: ${detail} (${quantity} ${unit}) - $${priceNet}`
        });

        revalidatePath(`/projects/${projectId}`);
        revalidatePath(`/projects/${projectId}/quote`);
        return { success: true, itemId: newItem.id };
    } catch (error: any) {
        console.error(`[QuoteItems][${traceId}] Critical error in addQuoteItem:`, error.message);
        return { success: false, error: "Error al guardar el ítem en la cotización.", traceId };
    }
}

export async function removeQuoteItem(itemId: string, projectId: string) {
    const traceId = `ITM-DEL-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const scope = await requirePermission('QUOTES_MANAGE');
        await ensureNotPaused(scope.orgId);

        console.log(`[QuoteItems][${traceId}] Deleting item=${itemId} from project=${projectId}`);

        await prisma.quoteItem.delete({
            where: { 
                id: itemId,
                organizationId: scope.orgId
            }
        });

        // Audit
        await AuditService.logAction({projectId: projectId, action: 'DELETE_ITEM', details: `Deleted item ID: ${itemId}`});

        revalidatePath(`/projects/${projectId}`);
        revalidatePath(`/projects/${projectId}/quote`);
        return { success: true };
    } catch (error: any) {
        console.error(`[QuoteItems][${traceId}] Critical error in removeQuoteItem:`, error.message);
        return { success: false, error: "Error al eliminar el ítem.", traceId };
    }
}

export async function updateQuoteItem(itemId: string, projectId: string, data: FormData) {
    const traceId = `ITM-UPD-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const scope = await requirePermission('QUOTES_MANAGE');
        await ensureNotPaused(scope.orgId);

        const sku = data.get('sku') as string;
        const detail = data.get('detail') as string;
        const quantity = parseFloat(data.get('quantity') as string);
        const unit = data.get('unit') as string;
        const priceNet = parseFloat(data.get('priceNet') as string);
        const costNet = parseFloat(data.get('costNet') as string) || 0;

        console.log(`[QuoteItems][${traceId}] Updating item=${itemId} in project=${projectId}`);

        await prisma.quoteItem.update({
            where: { id: itemId, organizationId: scope.orgId },
            data: {
                sku,
                detail,
                quantity,
                unit,
                priceNet,
                costNet
            }
        });

        // Audit
        await AuditService.logAction({projectId: projectId, action: 'UPDATE_ITEM', details: `Updated item: ${detail}`});

        revalidatePath(`/projects/${projectId}`);
        revalidatePath(`/projects/${projectId}/quote`);
        return { success: true };
    } catch (error: any) {
        console.error(`[QuoteItems][${traceId}] Critical error in updateQuoteItem:`, error.message);
        return { success: false, error: "Error al actualizar el ítem.", traceId };
    }
}

export async function toggleQuoteItemSelection(itemId: string, projectId: string, isSelected: boolean) {
    try {
        const scope = await requirePermission('QUOTES_MANAGE');
        await prisma.quoteItem.update({
            where: { id: itemId, organizationId: scope.orgId },
            data: { isSelected }
        });
        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function toggleAllQuoteItems(projectId: string, isSelected: boolean) {
    try {
        const scope = await requirePermission('QUOTES_MANAGE');
        await prisma.quoteItem.updateMany({
            where: { projectId, organizationId: scope.orgId },
            data: { isSelected }
        });
        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function addQuoteItemsBulk(projectId: string, items: any[]) {
    const traceId = `ITM-BLK-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const scope = await requirePermission('QUOTES_MANAGE');
        await ensureNotPaused(scope.orgId);

        console.log(`[QuoteItems][${traceId}] Adding ${items.length} items to project=${projectId}`);

        const itemsToInsert = items.map(item => ({
            id: Math.random().toString(36).substring(2, 10),
            organizationId: scope.orgId,
            projectId,
            sku: item.sku || '',
            detail: item.detail,
            quantity: Number(item.quantity) || 1,
            unit: item.unit || 'UN',
            priceNet: Number(item.priceNet) || 0,
            costNet: Number(item.costNet) || 0,
            isSelected: true
        }));

        await prisma.quoteItem.createMany({
            data: itemsToInsert
        });

        // Audit
        await AuditService.logAction({projectId: projectId, action: 'ADD_ITEMS_BULK', details: `Added ${items.length} items via bulk operation`});

        revalidatePath(`/projects/${projectId}`);
        revalidatePath(`/projects/${projectId}/quote`);
        return { success: true };
    } catch (error: any) {
        console.error(`[QuoteItems][${traceId}] Critical error in addQuoteItemsBulk:`, error.message);
        return { success: false, error: "Error en la operación masiva de ítems.", traceId };
    }
}
