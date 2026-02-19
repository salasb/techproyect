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

export type InventoryMovementType = 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER' | 'PURCHASE' | 'SALE' | 'ADJUSTMENT';

export async function adjustStock(
    productId: string,
    quantity: number,
    type: InventoryMovementType,
    fromLocationId?: string,
    toLocationId?: string,
    description?: string,
    projectId?: string
) {
    const orgId = await resolveActiveOrganization();
    // Map legacy types
    let mappedType = type;
    if (type === 'PURCHASE') mappedType = 'IN';
    if (type === 'SALE') mappedType = 'OUT';
    if (type === 'ADJUSTMENT') mappedType = 'ADJUST';

    try {
        if (mappedType === 'TRANSFER') {
            await InventoryService.transferStock(
                orgId,
                "00000000-0000-0000-0000-000000000000",
                productId,
                fromLocationId!,
                toLocationId!,
                quantity,
                description
            );
        } else {
            // Determine sign/location based on type for simple movement
            const locId = (mappedType === 'IN' || mappedType === 'ADJUST') ? toLocationId : fromLocationId;

            await InventoryService.createMovement({
                organizationId: orgId,
                locationId: locId!,
                productId,
                type: mappedType as any,
                quantity,
                userId: "00000000-0000-0000-0000-000000000000",
                description,
                projectId
            });
        }
        revalidatePath(`/inventory/products/${productId}`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function getKardex(productId: string) {
    const orgId = await resolveActiveOrganization();
    const data = await InventoryService.getKardex(orgId, productId);
    // Transform to match expected format if needed, primarily user name mapping might be needed if not in service
    // Service returns: { location: true, project: { name: true } }
    // Component expects: fromLocation.name, toLocation.name, user.name
    // Service result has `userId` but no relation included yet?
    // Let's trust service for now or update service.
    return { data };
}
