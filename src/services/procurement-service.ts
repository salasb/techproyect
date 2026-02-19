import prisma from "@/lib/prisma";
import { PurchaseOrderStatus, MovementType } from "@prisma/client";
import { InventoryService } from "./inventory-service";

export interface CreatePODTO {
    organizationId: string;
    vendorId: string;
    notes?: string;
    items: {
        productId?: string;
        projectId?: string;
        locationId?: string;
        description: string;
        quantity: number;
        priceNet: number;
        taxRate?: number;
    }[];
}

export interface ReceivePOLineDTO {
    itemId: string;
    quantity: number;
    locationId: string;
}

export class ProcurementService {
    /**
     * Creates a new Purchase Order in DRAFT mode.
     */
    static async createPO(data: CreatePODTO) {
        return await prisma.$transaction(async (tx) => {
            // Calculate totals
            let totalNet = 0;
            let totalTax = 0;

            const itemsData = data.items.map(item => {
                const itemNet = item.priceNet * item.quantity;
                const itemTax = itemNet * (item.taxRate ?? 0.19);
                totalNet += itemNet;
                totalTax += itemTax;

                return {
                    organizationId: data.organizationId,
                    productId: item.productId,
                    projectId: item.projectId,
                    locationId: item.locationId,
                    description: item.description,
                    quantity: item.quantity,
                    priceNet: item.priceNet,
                    taxRate: item.taxRate ?? 0.19,
                };
            });

            const po = await tx.purchaseOrder.create({
                data: {
                    organizationId: data.organizationId,
                    vendorId: data.vendorId,
                    status: 'DRAFT',
                    totalNet,
                    totalTax,
                    totalBruto: totalNet + totalTax,
                    notes: data.notes,
                    items: {
                        create: itemsData
                    }
                },
                include: {
                    items: true
                }
            });

            return po;
        });
    }

    /**
     * Transitions PO state (e.g., DRAFT -> SENT -> APPROVED).
     */
    static async updateStatus(organizationId: string, poId: string, status: PurchaseOrderStatus) {
        return await prisma.purchaseOrder.update({
            where: { id: poId, organizationId },
            data: { status }
        });
    }

    /**
     * Receives items from a PO. 
     * Creates Inventory Movements and updates received quantities.
     */
    static async receivePO(organizationId: string, userId: string, poId: string, lines: ReceivePOLineDTO[]) {
        return await prisma.$transaction(async (tx) => {
            // 1. Fetch PO and items
            const po = await tx.purchaseOrder.findUnique({
                where: { id: poId, organizationId },
                include: { items: true }
            });

            if (!po) throw new Error("Orden de compra no encontrada");
            if (po.status === 'CANCELED') throw new Error("No se puede recibir una OC cancelada");

            for (const line of lines) {
                const item = po.items.find(i => i.id === line.itemId);
                if (!item) throw new Error(`Item ${line.itemId} no pertenece a esta OC`);

                const remaining = item.quantity - item.receivedQuantity;
                if (line.quantity > remaining) {
                    throw new Error(`Cantidad recibida (${line.quantity}) excede el pendiente (${remaining}) para ${item.description}`);
                }

                // 2. Update Item receivedQuantity
                await tx.purchaseOrderItem.update({
                    where: { id: item.id },
                    data: {
                        receivedQuantity: { increment: line.quantity },
                        locationId: line.locationId // Update last destination
                    }
                });

                // 3. Create Inventory Movement (if product exists)
                if (item.productId) {
                    // We use the injected transaction `tx` if InventoryService supported it,
                    // but our InventoryService creates its own transaction. 
                    // To keep it transactional, we should ideally refactor InventoryService to accept a transaction,
                    // or just implement the movement logic here using tx.

                    // Fetch Product SKU
                    const product = await tx.product.findUnique({
                        where: { id: item.productId },
                        select: { sku: true }
                    });

                    if (product) {
                        await tx.inventoryMovement.create({
                            data: {
                                organizationId: organizationId,
                                locationId: line.locationId,
                                productId: item.productId,
                                sku: product.sku,
                                type: 'IN',
                                quantity: line.quantity,
                                userId: userId,
                                description: `Recepción OC #${po.poNumber}: ${item.description}`,
                                projectId: item.projectId
                            }
                        });

                        // Update ProductStock
                        await tx.productStock.upsert({
                            where: {
                                productId_locationId: {
                                    productId: item.productId,
                                    locationId: line.locationId
                                }
                            },
                            create: {
                                organizationId: organizationId,
                                productId: item.productId,
                                locationId: line.locationId,
                                quantity: line.quantity,
                            },
                            update: {
                                quantity: { increment: line.quantity }
                            }
                        });
                    }
                }

                // 4. Impute Cost to Project if exists
                if (item.projectId) {
                    await tx.costEntry.create({
                        data: {
                            organizationId: organizationId,
                            projectId: item.projectId,
                            date: new Date(),
                            category: 'HARDWARE', // Default for procurement? Or map from product?
                            description: `Compra via OC #${po.poNumber}: ${item.description}`,
                            amountNet: item.priceNet * line.quantity
                        }
                    });
                }
            }

            // 5. Update PO status
            const updatedPO = await tx.purchaseOrder.findUnique({
                where: { id: poId },
                include: { items: true }
            });

            const allReceived = updatedPO?.items.every(i => i.receivedQuantity >= i.quantity);
            const anyReceived = updatedPO?.items.some(i => i.receivedQuantity > 0);

            let newStatus = po.status;
            if (allReceived) newStatus = 'RECEIVED';
            else if (anyReceived) newStatus = 'PARTIALLY_RECEIVED';

            if (newStatus !== po.status) {
                await tx.purchaseOrder.update({
                    where: { id: poId },
                    data: { status: newStatus as PurchaseOrderStatus }
                });
            }

            return { success: true };
        });
    }

    /**
     * Cancels a PO. Only if no items received yet?
     * Decision: If items received, cancellation might be complex. 
     * For V1: only cancel if DRAFT/SENT/APPROVED (no receptions).
     */
    static async cancelPO(organizationId: string, poId: string, reason?: string) {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: poId, organizationId },
            include: { items: true }
        });

        if (!po) throw new Error("OC no encontrada");
        if (po.items.some(i => i.receivedQuantity > 0)) {
            throw new Error("No se puede cancelar una OC con recepciones parciales. Use devoluciones (v2).");
        }

        return await prisma.purchaseOrder.update({
            where: { id: poId },
            data: {
                status: 'CANCELED',
                notes: po.notes ? `${po.notes}\nCancelado: ${reason}` : `Cancelado: ${reason}`
            }
        });
    }

    static async getPOs(organizationId: string) {
        return await prisma.purchaseOrder.findMany({
            where: { organizationId },
            include: {
                vendor: { select: { name: true } },
                items: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async getPODetail(organizationId: string, poId: string) {
        return await prisma.purchaseOrder.findUnique({
            where: { id: poId, organizationId },
            include: {
                vendor: true,
                items: {
                    include: {
                        product: true,
                        project: true,
                        location: true
                    }
                }
            }
        });
    }

    static async getVendors(organizationId: string) {
        return await prisma.client.findMany({
            where: { organizationId, isVendor: true },
            orderBy: { name: 'asc' }
        });
    }
}
