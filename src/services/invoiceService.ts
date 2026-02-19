import prisma from "@/lib/prisma";
import { InvoiceStatus, PaymentRecord } from "@prisma/client";
import { AuditService } from "@/services/auditService";

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

        // Create Payment Record
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

        // Update Invoice Stats
        const newPaidAmount = (invoice.amountPaidGross || 0) + amount;
        let newStatus: InvoiceStatus = invoice.status;

        if (newPaidAmount >= (invoice.amountInvoicedGross || 0)) {
            newStatus = 'PAID';
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
            `Pago registrado: ${amount} (${method}). Estado: ${newStatus}`,
            { id: userId }
        );

        return payment;
    }
}
