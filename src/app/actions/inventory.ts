'use server'

import { InventoryService } from "@/services/inventory-service";
import { resolveActiveOrganization } from "@/lib/auth/server-resolver";
import { revalidatePath } from "next/cache";

export async function createInventoryMovementAction(formData: FormData) {
    const orgId = await resolveActiveOrganization();
    if (!orgId) throw new Error("No active organization");

    // Extract data
    const type = formData.get('type') as any;
    const productId = formData.get('productId') as string;
    const locationId = formData.get('locationId') as string;
    const quantity = parseFloat(formData.get('quantity') as string);
    const description = formData.get('description') as string;
    const projectId = formData.get('projectId') as string || undefined;

    // TODO: Get real userId from session/auth
    // For now, we assume implicit or passed? 
    // `resolveActiveOrganization` usually gives Org ID.
    // We need `getUser()` or similar. 
    // Let's assume a placeholder or extract from auth context if available.
    // Since we are in strict mode, we should ideally get the user ID.
    // Let's use a placeholder until Auth context is fully exposed here or passed.
    const userId = "00000000-0000-0000-0000-000000000000"; // Placeholder / System

    await InventoryService.createMovement({
        organizationId: orgId,
        locationId,
        productId,
        type,
        quantity,
        userId,
        description,
        projectId
    });

    revalidatePath('/inventory');
    revalidatePath(`/inventory/products/${productId}`);
}

export async function transferStockAction(formData: FormData) {
    const orgId = await resolveActiveOrganization();
    if (!orgId) throw new Error("No active organization");

    const productId = formData.get('productId') as string;
    const fromLocId = formData.get('fromLocationId') as string;
    const toLocId = formData.get('toLocationId') as string;
    const quantity = parseFloat(formData.get('quantity') as string);
    const description = formData.get('description') as string;
    const userId = "00000000-0000-0000-0000-000000000000";

    await InventoryService.transferStock(
        orgId,
        userId,
        productId,
        fromLocId,
        toLocId,
        quantity,
        description
    );

    revalidatePath(`/inventory/products/${productId}`);
}
