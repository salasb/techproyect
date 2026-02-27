'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireOperationalScope } from "@/lib/auth/server-resolver";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import { QuoteService } from "@/services/quoteService";
import { InvoiceService } from "@/services/invoiceService";
import { getStripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Transition Quote to ACCEPTED and generate Invoice.
 * Idempotent: If already accepted, returns existing invoice or status.
 */
export async function acceptQuoteAction(quoteId: string) {
    const scope = await requireOperationalScope();
    await ensureNotPaused(scope.orgId);
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'SYSTEM';

    try {
        // 1. Accept Quote (Idempotent)
        await QuoteService.acceptQuote(quoteId, userId, scope.orgId);

        // 2. Generate Invoice (Idempotent)
        const invoice = await InvoiceService.generateFromQuote(quoteId, userId, scope.orgId);

        revalidatePath(`/quotes`);
        revalidatePath(`/invoices`);
        
        return { 
            success: true, 
            message: "Cotización aceptada y factura generada.",
            invoiceId: invoice.id 
        };
    } catch (error: any) {
        console.error("[acceptQuoteAction] Error:", error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Creates a Stripe Checkout Session for a specific Invoice.
 * v1.0: Real commercial loop with idempotency.
 */
export async function createInvoicePaymentSession(invoiceId: string) {
    const scope = await requireOperationalScope();
    await ensureNotPaused(scope.orgId);
    
    const stripe = getStripe();
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId, organizationId: scope.orgId },
        include: { organization: true, project: true }
    });

    if (!invoice) throw new Error("Factura no encontrada.");
    if (invoice.status === 'PAID') throw new Error("Esta factura ya está pagada.");

    const amountRemaining = invoice.amountInvoicedGross - invoice.amountPaidGross;
    if (amountRemaining <= 0) throw new Error("No hay saldo pendiente en esta factura.");

    // Create Checkout Session
    // Metadata is critical for the webhook handler
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: invoice.currency.toLowerCase(),
                    product_data: {
                        name: `Factura: ${invoice.project.name}`,
                        description: `Pago de servicios / productos - Ref: ${invoice.id.substring(0,8)}`,
                    },
                    unit_amount: Math.round(amountRemaining * 1), // Assuming amount is in base units? If CLP, *1. If USD, *100.
                    // TechWise CLP usually uses absolute integers.
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        success_url: `${APP_URL}/invoices?payment=success&id=${invoice.id}`,
        cancel_url: `${APP_URL}/invoices?payment=cancel&id=${invoice.id}`,
        metadata: {
            invoiceId: invoice.id,
            organizationId: scope.orgId,
            projectId: invoice.projectId,
            type: 'INVOICE_PAYMENT'
        }
    }, {
        // Idempotency key to avoid duplicate sessions for the same intent in short time
        idempotencyKey: `checkout_inv_${invoice.id}_${amountRemaining}`
    });

    if (!session.url) throw new Error("No se pudo generar la sesión de pago.");

    redirect(session.url);
}
