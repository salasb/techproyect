import { NextRequest, NextResponse } from "next/server";
import { ShareLinkService } from "@/services/share-link-service";
import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const dynamic = 'force-dynamic';

export async function POST(
    req: NextRequest,
    { params }: { params: { token: string } }
) {
    const { token } = params;

    // 1. Verify Token
    const auth = await ShareLinkService.verifyLink(token);

    if (!auth.isValid || !auth.link || auth.link.entityType !== 'INVOICE') {
        return NextResponse.json({ error: auth.error || 'Invalid Link' }, { status: 400 });
    }

    const invoiceId = auth.link.entityId;

    try {
        // 2. Get Invoice data
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                project: {
                    include: { Client: true }
                }
            }
        });

        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

        const amountDue = invoice.amountInvoicedGross - invoice.amountPaidGross;

        if (amountDue <= 0) {
            // Already paid, redirect back
            return NextResponse.redirect(new URL(`/p/i/${token}`, req.url), 303);
        }

        // 3. Create Stripe Checkout Session
        const stripe = getStripe();

        // Ensure amount is at least $500 CLP (Stripe minimum varies, ~50 cents USD)
        // CLP is zero-decimal? No, usually treated as integer in Stripe API (amount=100 is 100 CLP).
        // Wait, for CLP, Stripe uses the amount as-is (100 CLP = 100). Valid minimum is ~500 CLP.
        // Assuming amountDue is in standard units.

        const session = await stripe.checkout.sessions.create({
            line_items: [{
                price_data: {
                    currency: 'clp', // Assuming CLP for now based on context
                    product_data: {
                        name: `Pago de Factura`,
                        description: `Proyecto: ${invoice.project.name || 'Sin Nombre'}`
                    },
                    unit_amount: Math.round(amountDue), // Stripe expects integer
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/p/i/${token}?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/p/i/${token}?canceled=true`,
            metadata: {
                invoiceId: invoice.id,
                projectId: invoice.project.id,
                organizationId: auth.link.organizationId
            },
            customer_email: (invoice.project as any).Client?.email || undefined, // If available
        });

        if (!session.url) {
            throw new Error("No session URL created");
        }

        return NextResponse.redirect(session.url, 303);

    } catch (error) {
        console.error("Error creating payment session:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
