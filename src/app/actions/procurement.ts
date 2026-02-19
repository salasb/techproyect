"use server";

import { ProcurementService, CreatePODTO, ReceivePOLineDTO } from "@/services/procurement-service";
import { resolveActiveOrganization } from "@/lib/auth/server-resolver";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import { revalidatePath } from "next/cache";
import { PurchaseOrderStatus } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

/**
 * Creates a new Purchase Order.
 */
export async function createPurchaseOrderAction(data: Omit<CreatePODTO, "organizationId">) {
    const orgId = await resolveActiveOrganization();
    await ensureNotPaused(orgId);

    try {
        const po = await ProcurementService.createPO({
            ...data,
            organizationId: orgId
        });
        revalidatePath("/purchases");
        return { success: true, id: po.id };
    } catch (e: any) {
        return { error: e.message };
    }
}

/**
 * Updates PO status.
 */
export async function updatePurchaseOrderStatusAction(poId: string, status: PurchaseOrderStatus) {
    const orgId = await resolveActiveOrganization();
    await ensureNotPaused(orgId);

    try {
        await ProcurementService.updateStatus(orgId, poId, status);
        revalidatePath("/purchases");
        revalidatePath(`/purchases/${poId}`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

/**
 * Receives items from a PO.
 */
export async function receivePurchaseOrderAction(poId: string, lines: ReceivePOLineDTO[]) {
    const orgId = await resolveActiveOrganization();
    await ensureNotPaused(orgId);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    try {
        await ProcurementService.receivePO(orgId, user.id, poId, lines);
        revalidatePath("/purchases");
        revalidatePath(`/purchases/${poId}`);
        revalidatePath("/inventory"); // Stock updated
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

/**
 * Cancels a PO.
 */
export async function cancelPurchaseOrderAction(poId: string, reason?: string) {
    const orgId = await resolveActiveOrganization();
    await ensureNotPaused(orgId);

    try {
        await ProcurementService.cancelPO(orgId, poId, reason);
        revalidatePath("/purchases");
        revalidatePath(`/purchases/${poId}`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

/**
 * Fetches all vendors.
 */
export async function getVendorsAction() {
    const orgId = await resolveActiveOrganization();
    return await ProcurementService.getVendors(orgId);
}

/**
 * Creates/Updates a vendor (reusing Client model with isVendor=true).
 */
export async function upsertVendorAction(data: {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
    contactName?: string;
}) {
    const orgId = await resolveActiveOrganization();
    await ensureNotPaused(orgId);

    try {
        if (data.id) {
            await prisma.client.update({
                where: { id: data.id, organizationId: orgId },
                data: { ...data, isVendor: true }
            });
        } else {
            await prisma.client.create({
                data: {
                    ...data,
                    organizationId: orgId,
                    isVendor: true
                }
            });
        }
        revalidatePath("/vendors");
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}
