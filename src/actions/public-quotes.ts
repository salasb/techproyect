'use server';

import { ShareService } from "@/services/share-service";
import { QuoteService } from "@/services/quoteService";
import { InvoiceService } from "@/services/invoiceService";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import { getStripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

import { requirePermission } from "@/lib/auth/server-resolver";

/**
 * Generates a public share link for a quote.
 * Requires internal QUOTES_MANAGE permission.
 */
export async function createQuoteShareLinkAction(quoteId: string) {
    const scope = await requirePermission('QUOTES_MANAGE');
    const { token } = await ShareService.createShareLink(quoteId, scope.orgId);
    
    const publicUrl = `${APP_URL}/p/q/${token}`;
    return { publicUrl };
}

/**
 * Publicly accepts a quote and generates an invoice.
 * Idempotent by design.
 */
export async function acceptPublicQuoteAction(token: string) {
    const shareLink = await ShareService.resolveToken(token);
    if (!shareLink) throw new Error("Link inválido o expirado.");

    // Guard: Organization status
    await ensureNotPaused(shareLink.organizationId);

    const quote = shareLink.quote;
    const orgId = shareLink.organizationId;

    try {
        // 1. Accept Quote (Internal Service)
        await QuoteService.acceptQuote(quote.id, 'CLIENT_PORTAL', orgId);

        // 2. Generate Invoice (Internal Service - Idempotent)
        const invoice = await InvoiceService.generateFromQuote(quote.id, 'CLIENT_PORTAL', orgId);

        revalidatePath(`/p/q/${token}`);
        return { ok: true, invoiceId: invoice.id };
    } catch (error: any) {
        console.error("[PublicAccept] Failed:", error.message);
        throw new Error("No pudimos procesar la aceptación. Contacta al proveedor.");
    }
}

/**
 * Generates a Stripe Checkout Session for a public invoice.
 */
export async function payPublicInvoiceAction(token: string) {
    const shareLink = await ShareService.resolveToken(token);
    if (!shareLink) throw new Error("Link inválido.");

    await ensureNotPaused(shareLink.organizationId);

    const invoice = shareLink.quote.invoices[0];
    if (!invoice) throw new Error("Invoice no generado.");
    if (invoice.status === 'PAID') throw new Error("Esta factura ya fue pagada.");

    const stripe = getStripe();
    const orgId = shareLink.organizationId;

    // Get Organization Details for Stripe
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { subscription: true }
    });

    const session = await stripe.checkout.sessions.create({
        customer: org?.subscription?.providerCustomerId || undefined,
        line_items: [
            {
                price_data: {
                    currency: 'clp',
                    product_data: {
                        name: `Pago Cotización #${shareLink.quote.version} - ${org?.name}`,
                        description: `Proyecto: ${shareLink.quote.project.name}`,
                    },
                    unit_amount: Math.round((shareLink.quote.totalNet + shareLink.quote.totalTax)),
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        success_url: `${APP_URL}/p/q/${token}?payment=success`,
        cancel_url: `${APP_URL}/p/q/${token}?payment=cancel`,
        metadata: {
            invoiceId: invoice.id,
            organizationId: orgId,
            type: 'PUBLIC_INVOICE_PAYMENT'
        },
        payment_intent_data: {
            metadata: {
                invoiceId: invoice.id,
                organizationId: orgId
            }
        }
    }, {
        idempotencyKey: `pay_pub_${invoice.id}_${orgId}`
    });

    if (!session.url) throw new Error("Error al crear sesión de pago.");

    return { url: session.url };
}
