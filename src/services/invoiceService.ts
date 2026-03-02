import prisma from "@/lib/prisma";
import { InvoiceStatus, PaymentRecord } from "@prisma/client";
import { AuditService } from "@/services/auditService";
import { ActivationService } from "./activation-service";
import { OutboundWebhookService } from "./outbound-webhook-service";

export class InvoiceService {
    /**
     * Generates a DRAFT invoice from an Accepted Quote.
     */
    static async generateFromQuote(quoteId: string, userId: string, organizationId: string) {
        const quote = await prisma.quote.findUnique({
            where: { id: quoteId },
            include: { project: true }
        });

        if (!quote) throw new Error("Quote not found");
        if (quote.status !== 'ACCEPTED') throw new Error("La cotización debe estar aceptada para facturar.");

        // Check if invoice already exists for this quote?
        const existingInvoice = await prisma.invoice.findFirst({
            where: { quoteId: quoteId }
        });
        if (existingInvoice) return existingInvoice;

        // Calculate totals (Gross = Net + Tax ideally, but schema has totalNet/Tax in Quote and only Gross in Invoice?)
        // Schema: Quote has totalNet, totalTax. Invoice has amountInvoicedGross.
        const totalGross = (quote.totalNet || 0) + (quote.totalTax || 0);

        const invoice = await prisma.invoice.create({
            data: {
                projectId: quote.projectId,
                organizationId,
                quoteId,
                status: 'DRAFT',
                currency: 'CLP', // Should come from Project or Defaults
                amountInvoicedGross: totalGross,
                amountPaidGross: 0,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days
            }
        });

        await ActivationService.trackFunnelEvent('INVOICE_CREATED', organizationId, `invoice_created_${invoice.id}`, userId);

        // Outbound Webhook
        await OutboundWebhookService.dispatch(organizationId, 'invoice.created', {
            invoiceId: invoice.id,
            projectId: invoice.projectId,
            amount: totalGross,
            currency: invoice.currency,
            status: invoice.status
        });

        await AuditService.logAction(
            quote.projectId,
            'INVOICE_CREATED',
            `Factura generada desde Cotización #${quote.version}.`,
            { id: userId }
        );

        return invoice;
    }

    /**
     * Registers a payment for an invoice.
     * Updates status to PAID or PARTIALLY_PAID.
     * Idempotent: checks for existing reference.
     */
    static async registerPayment(
        invoiceId: string,
        amount: number,
        method: string,
        reference: string | null,
        userId: string,
        organizationId: string
    ) {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId }
        });

        if (!invoice) throw new Error("Invoice not found");

        // 1. Idempotency Check
        if (reference) {
            const existingPayment = await prisma.paymentRecord.findFirst({
                where: { reference, invoiceId, organizationId }
            });
            if (existingPayment) {
                console.log(`[InvoiceService] Payment with reference ${reference} already registered. Skipping.`);
                return existingPayment;
            }
        }

        // 2. Create Payment Record
        const payment = await prisma.paymentRecord.create({
            data: {
                invoiceId,
                organizationId,
                amount,
                method,
                reference,
                status: 'COMPLETED',
                currency: invoice.currency
            }
        });

        // 3. Update Invoice Stats
        const newPaidAmount = (invoice.amountPaidGross || 0) + amount;
        let newStatus: InvoiceStatus = invoice.status;

        if (newPaidAmount >= (invoice.amountInvoicedGross || 0)) {
            newStatus = 'PAID';
            await ActivationService.trackFunnelEvent('INVOICE_PAID', organizationId, `inv_paid_${invoiceId}`, userId);
            
            // Outbound Webhook
            await OutboundWebhookService.dispatch(organizationId, 'invoice.paid', {
                invoiceId,
                projectId: invoice.projectId,
                amountPaid: amount,
                totalPaid: newPaidAmount,
                status: 'PAID'
            });
        } else if (newPaidAmount > 0) {
            newStatus = 'PARTIALLY_PAID';
        }

        await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                amountPaidGross: newPaidAmount,
                status: newStatus,
                updatedAt: new Date()
            }
        });

        await AuditService.logAction(
            invoice.projectId,
            'INVOICE_PAYMENT',
            `Pago registrado: ${amount} (${method}). Referencia: ${reference}. Estado: ${newStatus}`,
            { id: userId }
        );

        return payment;
    }
}
