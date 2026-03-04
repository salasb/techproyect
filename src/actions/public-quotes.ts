'use server';

import { ShareLinkService } from "@/services/share-link-service";
import { QuoteService } from "@/services/quoteService";
import { InvoiceService } from "@/services/invoiceService";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import { getStripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/lib/security/rate-limit";
import { headers } from "next/headers";
import { requirePermission } from "@/lib/auth/server-resolver";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Generates a public share link for a quote using the existing ShareLinkService.
 */
export async function createQuoteShareLinkAction(quoteId: string) {
    const scope = await requirePermission('QUOTES_MANAGE');
    
    // Check if a link already exists to reuse or rotate
    const existing = await prisma.shareLink.findFirst({
        where: { entityId: quoteId, entityType: 'QUOTE', revokedAt: null, expiresAt: { gt: new Date() } }
    });

    let url: string;
    if (existing) {
        const token = "REUSE_NOT_POSSIBLE_WITHOUT_TOKEN"; 
        // ShareLinkService.createLink always creates a new one. 
        url = await ShareLinkService.createLink(scope.orgId, 'QUOTE', quoteId, scope.userId);
    } else {
        url = await ShareLinkService.createLink(scope.orgId, 'QUOTE', quoteId, scope.userId);
    }
    
    return { publicUrl: url };
}

/**
 * Publicly accepts a quote.
 */
export async function acceptPublicQuoteAction(token: string) {
    const clientIp = (await headers()).get('x-forwarded-for') || 'unknown';
    const limit = await rateLimit(`accept_${token}_${clientIp}`, 5, 60000);
    if (!limit.success) throw new Error(`Demasiados intentos. Reintenta en ${limit.retryAfter} segundos.`);

    const auth = await ShareLinkService.verifyLink(token);
    if (!auth.isValid || !auth.link) throw new Error("Link inválido o expirado.");

    await ensureNotPaused(auth.link.organizationId);

    try {
        await QuoteService.acceptQuote(auth.link.entityId, 'CLIENT_PORTAL', auth.link.organizationId);
        const invoice = await InvoiceService.generateFromQuote(auth.link.entityId, 'CLIENT_PORTAL', auth.link.organizationId);

        revalidatePath(`/p/q/${token}`);
        return { ok: true, invoiceId: invoice.id };
    } catch (error: any) {
        console.error("[PublicAccept] Failed:", error.message);
        throw new Error("No pudimos procesar la aceptación.");
    }
}

/**
 * Generates Stripe session for public payment.
 */
export async function payPublicInvoiceAction(token: string) {
    const clientIp = (await headers()).get('x-forwarded-for') || 'unknown';
    const limit = await rateLimit(`pay_${token}_${clientIp}`, 5, 60000);
    if (!limit.success) throw new Error(`Demasiados intentos.`);

    const auth = await ShareLinkService.verifyLink(token);
    if (!auth.isValid || !auth.link) throw new Error("Link inválido.");

    await ensureNotPaused(auth.link.organizationId);

    const quote = await prisma.quote.findUnique({
        where: { id: auth.link.entityId },
        include: { invoices: { orderBy: { createdAt: 'desc' }, take: 1 }, project: true }
    });

    const invoice = quote?.invoices[0];
    if (!invoice) throw new Error("Invoice no generado.");
    if (invoice.status === 'PAID') throw new Error("Ya pagada.");

    const stripe = getStripe();
    const org = await prisma.organization.findUnique({
        where: { id: auth.link.organizationId },
        include: { subscription: true }
    });

    const session = await stripe.checkout.sessions.create({
        customer: org?.subscription?.providerCustomerId || undefined,
        line_items: [{
            price_data: {
                currency: 'clp',
                product_data: {
                    name: `Pago Cotización #${quote?.version} - ${org?.name}`,
                },
                unit_amount: Math.round((quote!.totalNet + quote!.totalTax)),
            },
            quantity: 1,
        }],
        mode: 'payment',
        success_url: `${APP_URL}/p/q/${token}?payment=success`,
        cancel_url: `${APP_URL}/p/q/${token}?payment=cancel`,
        metadata: {
            invoiceId: invoice.id,
            organizationId: auth.link.organizationId,
            type: 'PUBLIC_INVOICE_PAYMENT'
        }
    }, {
        idempotencyKey: `pay_pub_${invoice.id}`
    });

    return { url: session.url };
}
