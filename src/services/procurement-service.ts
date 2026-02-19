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
}

export interface ReceivePODTO {
    organizationId: string;
    userId: string;
    poId: string;
    receiptNumber: string; // The idempotency key (e.g. Vendor Invoice #)
    locationId: string;
    notes?: string;
    lines: ReceivePOLineDTO[];
}

export class ProcurementService {
    /**
     * Creates a new Purchase Order in DRAFT mode.
     */
    static async createPO(data: CreatePODTO) {
        return await prisma.$transaction(async (tx) => {
            // 1. Get and increment poCounter atomically
            const org = await tx.organization.update({
                where: { id: data.organizationId },
                data: { poCounter: { increment: 1 } },
                select: { poCounter: true }
            });

            const nextPoNumber = org.poCounter;

            // 2. Calculate totals
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
                    locationId: item.locationId ?? null,
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
                    poNumber: nextPoNumber,
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
    static async receivePO(data: ReceivePODTO) {
        return await prisma.$transaction(async (tx) => {
            // 0. Check Idempotency: Has this receiptNumber already been processed for this PO?
            const existingReceipt = await tx.purchaseOrderReceipt.findUnique({
                where: {
                    organizationId_purchaseOrderId_receiptNumber: {
                        organizationId: data.organizationId,
                        purchaseOrderId: data.poId,
                        receiptNumber: data.receiptNumber
                    }
                }
            });

            if (existingReceipt) {
                console.log(`[Procurement] Receipt ${data.receiptNumber} already processed. Skipping.`);
                return { success: true, alreadyProcessed: true };
            }

            // 1. Fetch PO and items
            const po = await tx.purchaseOrder.findUnique({
                where: { id: data.poId, organizationId: data.organizationId },
                include: { items: true }
            });

            if (!po) throw new Error("Orden de compra no encontrada");

            // Status Contract: No receive in CANCELLED or already RECEIVED
            if (po.status === 'CANCELED') throw new Error("No se puede recibir una OC cancelada");
            if (po.status === 'RECEIVED') throw new Error("La OC ya ha sido recibida completamente");

            // 2. Create Receipt Record
            await tx.purchaseOrderReceipt.create({
                data: {
                    organizationId: data.organizationId,
                    purchaseOrderId: data.poId,
                    receiptNumber: data.receiptNumber,
                    receivedBy: data.userId,
                    notes: data.notes,
                    items: {
                        create: data.lines.map(l => ({
                            purchaseOrderItemId: l.itemId,
                            quantity: l.quantity
                        }))
                    }
                }
            });

            // 3. Process each received line
            for (const line of data.lines) {
                const item = po.items.find(i => i.id === line.itemId);
                if (!item) throw new Error(`Item ${line.itemId} no pertenece a esta OC`);

                const remaining = item.quantity - item.receivedQuantity;
                if (line.quantity > remaining) {
                    throw new Error(`Cantidad recibida (${line.quantity}) excede el pendiente (${remaining}) para ${item.description}`);
                }

                // 3a. Update Item receivedQuantity
                await tx.purchaseOrderItem.update({
                    where: { id: item.id },
                    data: {
                        receivedQuantity: { increment: line.quantity },
                        locationId: data.locationId // Update last destination
                    }
                });

                // 3b. Create Inventory Movement (if product exists)
                if (item.productId) {
                    // Fetch Product SKU
                    const product = await tx.product.findUnique({
                        where: { id: item.productId },
                        select: { sku: true }
                    });

                    if (product) {
                        await tx.inventoryMovement.create({
                            data: {
                                organizationId: data.organizationId,
                                locationId: data.locationId,
                                productId: item.productId,
                                sku: product.sku,
                                type: 'IN',
                                quantity: line.quantity,
                                userId: data.userId,
                                description: `Recepción OC #${po.poNumber} (Recibo: ${data.receiptNumber}): ${item.description}`,
                                projectId: item.projectId
                            }
                        });

                        // Update ProductStock
                        await tx.productStock.upsert({
                            where: {
                                productId_locationId: {
                                    productId: item.productId,
                                    locationId: data.locationId
                                }
                            },
                            create: {
                                organizationId: data.organizationId,
                                productId: item.productId,
                                locationId: data.locationId,
                                quantity: line.quantity,
                            },
                            update: {
                                quantity: { increment: line.quantity }
                            }
                        });
                    }
                }

                // 3c. Impute Cost to Project if exists
                if (item.projectId) {
                    await tx.costEntry.create({
                        data: {
                            organizationId: data.organizationId,
                            projectId: item.projectId,
                            date: new Date(),
                            category: 'HARDWARE',
                            description: `Compra via OC #${po.poNumber} (Recibo: ${data.receiptNumber}): ${item.description}`,
                            amountNet: item.priceNet * line.quantity
                        }
                    });
                }
            }

            // 4. Update PO status
            const updatedPO = await tx.purchaseOrder.findUnique({
                where: { id: data.poId },
                include: { items: true }
            });

            const allReceived = updatedPO?.items.every(i => i.receivedQuantity >= i.quantity);
            const anyReceived = updatedPO?.items.some(i => i.receivedQuantity > 0);

            let newStatus: PurchaseOrderStatus = po.status;
            if (allReceived) newStatus = 'RECEIVED';
            else if (anyReceived) newStatus = 'PARTIALLY_RECEIVED';

            if (newStatus !== po.status) {
                await tx.purchaseOrder.update({
                    where: { id: data.poId },
                    data: { status: newStatus as PurchaseOrderStatus }
                });
            }

            return { success: true };
        });
    }

    /**
     * Cancels a PO. 
     */
    static async cancelPO(organizationId: string, poId: string, reason?: string) {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: poId, organizationId },
            include: { items: true }
        });

        if (!po) throw new Error("OC no encontrada");
        if (po.status === 'RECEIVED' || po.status === 'PARTIALLY_RECEIVED') {
            throw new Error("No se puede cancelar una OC con recepciones. Use devoluciones (v2).");
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
                items: true,
                receipts: {
                    include: { items: true }
                }
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
                },
                receipts: {
                    orderBy: { receivedAt: 'desc' },
                    include: {
                        items: {
                            include: {
                                purchaseOrderItem: true
                            }
                        }
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
