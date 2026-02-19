import prisma from "@/lib/prisma";
import { QuoteStatus, Prisma } from "@prisma/client";
import { AuditService } from "@/services/auditService";

export class QuoteService {
    /**
     * Creates a new draft quote for a project.
     */
    static async createQuote(projectId: string, userId: string, organizationId: string) {
        // Guard: Check if organization is active (PAUSE check)
        // This should be done by the caller or a shared guard, but good to have here.

        const quote = await prisma.quote.create({
            data: {
                projectId,
                version: 1,
                status: 'DRAFT',
            }
        });

        await AuditService.logAction(
            projectId,
            'QUOTE_CREATED',
            `Cotización borrador #${quote.version} creada. QuoteId: ${quote.id}`,
            { id: userId }
        );

        return quote;
    }

    /**
     * Freezes a quote and marks it as SENT.
     * Requires the project to have a Client assigned.
     */
    static async sendQuote(quoteId: string, userId: string, organizationId: string) {
        const quote = await prisma.quote.findUnique({
            where: { id: quoteId },
            include: { project: true, items: true }
        });

        if (!quote) throw new Error("Quote not found");
        if (quote.status !== 'DRAFT') throw new Error("Solo cotizaciones en borrador pueden enviarse.");

        // 1. Validate Client
        if (!quote.project.clientId) {
            throw new Error("CLIENT_REQUIRED: El proyecto debe tener un cliente asignado antes de enviar la cotización.");
        }

        // 2. Freeze and Update
        const updatedQuote = await prisma.quote.update({
            where: { id: quoteId },
            data: {
                status: 'SENT',
                sentAt: new Date(),
                frozenAt: new Date(), // Logic: Snapshots items state effectively by blocking updates
            }
        });

        // 3. Audit
        await AuditService.logAction(
            quote.projectId,
            'QUOTE_SENT',
            `Cotización #${quote.version} enviada al cliente. (Frozen)`,
            { id: userId }
        );

        return updatedQuote;
    }

    /**
     * Creates a new version (Revision) from an existing Sent/Accepted/Rejected quote.
     * The old quote remains as history.
     */
    static async reviseQuote(originalQuoteId: string, userId: string, organizationId: string) {
        const original = await prisma.quote.findUnique({
            where: { id: originalQuoteId },
            include: { items: true }
        });

        if (!original) throw new Error("Quote not found");

        // Find latest version to correct version number
        const lastQuote = await prisma.quote.findFirst({
            where: { projectId: original.projectId },
            orderBy: { version: 'desc' }
        });
        const nextVersion = (lastQuote?.version || 0) + 1;

        // Check if there is already a DRAFT revision?
        const existingDraft = await prisma.quote.findFirst({
            where: { projectId: original.projectId, status: 'DRAFT' }
        });
        if (existingDraft) return existingDraft;

        // Create new Quote
        const newQuote = await prisma.quote.create({
            data: {
                projectId: original.projectId,
                version: nextVersion,
                status: 'DRAFT',
                revisionOfId: original.id,
                totalNet: original.totalNet,
                totalTax: original.totalTax,
            }
        });

        // Copy Items
        if (original.items.length > 0) {
            const itemsData = original.items.map(item => ({
                projectId: original.projectId,
                organizationId: item.organizationId, // Copy org from item
                quoteId: newQuote.id,
                detail: item.detail,
                quantity: item.quantity,
                priceNet: item.priceNet,
                costNet: item.costNet,
                sku: item.sku,
                unit: item.unit,
                isSelected: item.isSelected
            }));

            await prisma.quoteItem.createMany({
                data: itemsData
            });
        }

        // Audit
        await AuditService.logAction(
            original.projectId,
            'QUOTE_REVISION',
            `Revisión v${newQuote.version} creada a partir de v${original.version}.`,
            { id: userId }
        );

        return newQuote;
    }

    /**
     * Idempotent acceptance of a quote.
     */
    static async acceptQuote(quoteId: string, userId: string | null = null, organizationId: string) {
        const quote = await prisma.quote.findUnique({
            where: { id: quoteId }
        });

        if (!quote) throw new Error("Quote not found");

        // Idempotency
        if (quote.status === 'ACCEPTED') {
            return quote; // No-op
        }

        if (quote.status !== 'SENT') {
            // Maybe allow accepting REVISED? No, only SENT.
            throw new Error("Solo cotizaciones enviadas pueden ser aceptadas.");
        }

        const acceptedQuote = await prisma.quote.update({
            where: { id: quoteId },
            data: {
                status: 'ACCEPTED',
                updatedAt: new Date()
            }
        });

        // Audit
        await AuditService.logAction(
            quote.projectId,
            'QUOTE_ACCEPTED',
            `Cotización #${quote.version} aceptada por cliente.`,
            { id: userId || 'SYSTEM' }
        );

        // Notify? (Events)

        return acceptedQuote;
    }

    /**
     * Creates a DRAFT quote from the current Project state (items).
     * Used for the very first quote or when resetting.
     */
    static async createFromProject(projectId: string, userId: string, organizationId: string) {
        // Get Project and Items
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                quoteItems: true
            }
        });

        if (!project) throw new Error("Project not found");

        // Determine Version
        const lastQuote = await prisma.quote.findFirst({
            where: { projectId },
            orderBy: { version: 'desc' }
        });
        const nextVersion = (lastQuote?.version || 0) + 1;

        // Create Header
        const quote = await prisma.quote.create({
            data: {
                projectId,
                // organizationId NOT in Quote model
                version: nextVersion,
                status: 'DRAFT',
                // Calculate totals from items
                totalNet: project.quoteItems.filter(i => i.isSelected).reduce((acc, item) => acc + (item.priceNet || 0) * (item.quantity || 1), 0),
                totalTax: 0 // Calc later if needed
            }
        });

        // Copy Items
        // Project items are ALREADY QuoteItems in the DB (linked to Project).
        // For a snapshot, we should create NEW QuoteItems linked to this Quote.
        // OR we just link existing items to this Quote?
        // If we link existing items, then modifying them in Project modifies the Quote.
        // So we MUST CLONE them for snapshotting (Freezing).
        // Since we are creating a DRAFT, we can clone them now. 
        // When 'sendQuote' freezes, we ensure they are not modified?
        // Actually, if we clone them now, they are independent.
        if (project.quoteItems.length > 0) {
            const itemsData = project.quoteItems.map(item => ({
                quoteId: quote.id,
                projectId: projectId,
                organizationId,
                detail: item.detail || '',
                quantity: item.quantity || 1,
                priceNet: item.priceNet || 0,
                costNet: item.costNet || 0,
                sku: item.sku,
                unit: item.unit || 'UN',
                isSelected: item.isSelected
            }));

            await prisma.quoteItem.createMany({
                data: itemsData
            });
        }

        return quote;
    }

    static async revokeAcceptance(quoteId: string, userId: string, organizationId: string) {
        const quote = await prisma.quote.update({
            where: { id: quoteId },
            data: {
                status: 'SENT', // Revert to SENT
                updatedAt: new Date()
            }
        });

        await AuditService.logAction(
            quote.projectId,
            'QUOTE_REVOKED',
            `Aceptación de cotización #${quote.version} revocada.`,
            { id: userId }
        );
        return quote;
    }
}
