import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import type Stripe from 'stripe';
import { SubscriptionStatus } from '@prisma/client';
import { ActivationService } from '@/services/activation-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const start = Date.now();
    const body = await req.text();
    const requestHeaders = await headers();
    const sig = requestHeaders.get('stripe-signature');
    const e2eSecretStr = requestHeaders.get('x-e2e-secret');
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    // 1. Signature Verification / E2E Bypass
    try {
        const expectedE2ESecret = process.env.E2E_TEST_SECRET || 'E2E_LOCAL_TEST_SECRET';

        if (process.env.NODE_ENV !== 'production' && e2eSecretStr && e2eSecretStr === expectedE2ESecret) {
            console.warn('Bypassing Stripe webhook signature verification for E2E test.');
            event = JSON.parse(body) as Stripe.Event;
        } else {
            if (!sig || !endpointSecret) {
                console.error('Webhook Error: Missing signature or secret');
                return Response.json({ error: 'Missing signature or secret' }, { status: 400 });
            }
            const stripe = getStripe();
            event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
        }
    } catch (err: any) {
        console.error(`Webhook Verification Error: ${err.message}`);
        return Response.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // 2. Idempotency Check
    const existingEvent = await prisma.stripeEvent.findUnique({
        where: { id: event.id }
    });

    if (existingEvent?.status === 'OK') {
        return Response.json({ received: true, duplication: true });
    }

    // Upsert as PENDING
    await prisma.stripeEvent.upsert({
        where: { id: event.id },
        update: {
            status: 'PENDING',
        },
        create: {
            id: event.id,
            type: event.type,
            processed: false,
            status: 'PENDING',
            data: event.data.object as any
        }
    });

    try {
        // 3. Process Event
        switch (event.type as any) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const orgId = session.metadata?.organizationId;
                const invoiceId = session.metadata?.invoiceId;

                if (orgId && session.subscription) {
                    const stripe = getStripe();
                    const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);

                    await prisma.subscription.update({
                        where: { organizationId: orgId },
                        data: {
                            status: SubscriptionStatus.ACTIVE,
                            providerSubscriptionId: stripeSub.id,
                            providerCustomerId: session.customer as string,
                            currentPeriodEnd: (stripeSub as any).current_period_end ? new Date((stripeSub as any).current_period_end * 1000) : undefined,
                            seatLimit: (stripeSub as any).items?.data?.[0]?.quantity || 1,
                        }
                    });

                    await ActivationService.trackFunnelEvent('CHECKOUT_COMPLETED', orgId, `checkout_${event.id}`, session.customer as string);
                    await prisma.auditLog.create({
                        data: {
                            organizationId: orgId,
                            action: 'STRIPE_WEBHOOK_PROCESSED',
                            details: `Processed checkout.session.completed for customer ${session.customer}`,
                            userName: 'Stripe Webhook'
                        }
                    });
                } else if (invoiceId && session.payment_status === 'paid') {
                    const amount = session.amount_total ? session.amount_total / 100 : 0;
                    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
                    if (invoice) {
                        const newAmountPaid = invoice.amountPaidGross + amount;
                        await prisma.invoice.update({
                            where: { id: invoiceId },
                            data: {
                                amountPaidGross: newAmountPaid,
                                updatedAt: new Date().toISOString()
                            }
                        });
                        const { AuditService } = await import("@/services/auditService");
                        const status = newAmountPaid >= invoice.amountInvoicedGross ? ' (Pagada Totalmente)' : ' (Pago Parcial)';
                        await AuditService.logAction(
                            invoice.projectId,
                            'INVOICE_PAYMENT',
                            `Pago online registrado vía Stripe por $${amount.toLocaleString()}${status}`,
                            { name: 'Stripe System', ip: 'Stripe Webhook', userAgent: 'Stripe/1.0' }
                        );
                    }
                }
                break;
            }

            case 'customer.subscription.updated': {
                const stripeSub = event.data.object as Stripe.Subscription;
                let orgId = stripeSub.metadata?.organizationId;

                if (!orgId) {
                    const sub = await prisma.subscription.findFirst({
                        where: { providerSubscriptionId: stripeSub.id }
                    });
                    if (sub) orgId = sub.organizationId;
                }

                if (orgId) {
                    let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;
                    const stripeStatus = (stripeSub as any).status;
                    if (stripeStatus === 'active') status = SubscriptionStatus.ACTIVE;
                    else if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') status = SubscriptionStatus.PAST_DUE;
                    else if (stripeStatus === 'canceled' || stripeStatus === 'incomplete_expired') status = SubscriptionStatus.CANCELED;
                    else if (stripeStatus === 'trialing') status = SubscriptionStatus.TRIALING;
                    else if (stripeStatus === 'paused') status = SubscriptionStatus.PAUSED;

                    const oldSubscription = await prisma.subscription.findUnique({ where: { organizationId: orgId } });

                    await prisma.subscription.update({
                        where: { organizationId: orgId },
                        data: {
                            status: status,
                            currentPeriodEnd: (stripeSub as any).current_period_end ? new Date((stripeSub as any).current_period_end * 1000) : undefined,
                            cancelAtPeriodEnd: (stripeSub as any).cancel_at_period_end,
                            seatLimit: (stripeSub as any).items?.data?.[0]?.quantity || 1,
                        }
                    });

                    if (status === SubscriptionStatus.TRIALING && oldSubscription?.status !== SubscriptionStatus.TRIALING) {
                        await ActivationService.trackFunnelEvent('TRIAL_STARTED', orgId, `trial_start_${event.id}`);
                    }
                    if (status === SubscriptionStatus.ACTIVE && oldSubscription?.status !== SubscriptionStatus.ACTIVE) {
                        await ActivationService.trackFunnelEvent('SUBSCRIPTION_ACTIVE', orgId, `sub_active_${event.id}`);
                    }

                    await prisma.auditLog.create({
                        data: {
                            organizationId: orgId,
                            action: 'STRIPE_WEBHOOK_PROCESSED',
                            details: `Processed customer.subscription.updated (New Status: ${status})`,
                            userName: 'Stripe Webhook'
                        }
                    });
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const stripeSub = event.data.object as Stripe.Subscription;
                let orgId = stripeSub.metadata?.organizationId;
                if (!orgId) {
                    const sub = await prisma.subscription.findFirst({ where: { providerSubscriptionId: stripeSub.id } });
                    if (sub) orgId = sub.organizationId;
                }

                if (orgId) {
                    await prisma.subscription.update({
                        where: { organizationId: orgId },
                        data: {
                            status: SubscriptionStatus.CANCELED,
                            providerSubscriptionId: null,
                        }
                    });
                    await ActivationService.trackFunnelEvent('SUBSCRIPTION_CANCELED', orgId, `sub_del_${event.id}`);
                    await prisma.auditLog.create({
                        data: {
                            organizationId: orgId,
                            action: 'STRIPE_WEBHOOK_PROCESSED',
                            details: `Processed customer.subscription.deleted`,
                            userName: 'Stripe Webhook'
                        }
                    });
                }
                break;
            }

            case 'ping.e2e_test': {
                console.log("E2E Ping Event Processed");
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        // 4. Success Update
        await prisma.stripeEvent.update({
            where: { id: event.id },
            data: {
                processed: true,
                status: 'OK',
                processedAt: new Date(),
                durationMs: Date.now() - start,
                error: null
            }
        });

        return Response.json({ received: true });

    } catch (error: any) {
        const errorMessage = error.message || "Unknown error";
        console.error(`Webhook Processing Error [${event?.id}]: ${errorMessage}`);

        if (event?.id) {
            await prisma.stripeEvent.update({
                where: { id: event.id },
                data: {
                    processed: false,
                    status: 'ERROR',
                    error: errorMessage,
                    processedAt: new Date(),
                    durationMs: Date.now() - start
                }
            });
        }

        return Response.json({ error: 'Webhook processing failed', details: errorMessage }, { status: 500 });
    }
}
