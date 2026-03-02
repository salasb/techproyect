import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import type Stripe from 'stripe';
import { SubscriptionStatus } from '@prisma/client';
import { ActivationService } from '@/services/activation-service';
import { trackSlo } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const start = Date.now();
    const traceId = `STW-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const body = await req.text();
    const requestHeaders = await headers();
    const sig = requestHeaders.get('stripe-signature');
    const e2eSecretStr = requestHeaders.get('x-e2e-secret');
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    console.log(`[StripeWebhook][${traceId}] Received webhook request`);

    // 1. Signature Verification / E2E Bypass
    try {
        const expectedE2ESecret = process.env.E2E_TEST_SECRET || 'E2E_LOCAL_TEST_SECRET';

        if (process.env.NODE_ENV !== 'production' && e2eSecretStr && e2eSecretStr === expectedE2ESecret) {
            console.warn(`[StripeWebhook][${traceId}] Bypassing signature verification for E2E test.`);
            event = JSON.parse(body) as Stripe.Event;
        } else {
            if (!sig || !endpointSecret) {
                console.error(`[StripeWebhook][${traceId}] Missing signature or secret`);
                return Response.json({ error: 'Missing signature or secret' }, { status: 400 });
            }
            const stripe = getStripe();
            event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
        }
    } catch (err: any) {
        console.error(`[StripeWebhook][${traceId}] Verification Error: ${err.message}`);
        return Response.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    console.log(`[StripeWebhook][${traceId}] Event type: ${event.type}, ID: ${event.id}`);

    // 2. Idempotency Check
    const existingEvent = await prisma.stripeEvent.findUnique({
        where: { id: event.id }
    });

    if (existingEvent?.status === 'OK') {
        console.log(`[StripeWebhook][${traceId}] Event ${event.id} already processed. Skipping.`);
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
            data: event.data.object as any,
            orgId: (event.data.object as any).metadata?.organizationId || null
        }
    });

    try {
        // 3. Process Event
        switch (event.type as any) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const orgId = session.metadata?.organizationId;
                const invoiceId = session.metadata?.invoiceId;
                const paymentType = session.metadata?.type;
                const sessionTraceId = session.metadata?.traceId;
                
                console.log(`[StripeWebhook][${traceId}] Processing checkout.session.completed for Org: ${orgId}, OriginTrace: ${sessionTraceId}`);

                if (orgId && (session.mode === 'subscription' || session.subscription)) {
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
                            details: `[${traceId}] Processed subscription checkout.session.completed. Origin: ${sessionTraceId}`,
                            userName: 'Stripe Webhook'
                        }
                    });
                } else if (invoiceId && paymentType === 'INVOICE_PAYMENT' && session.payment_status === 'paid') {
                    const amount = session.amount_total ? session.amount_total / 1 : 0;
                    const { InvoiceService } = await import("@/services/invoiceService");
                    
                    console.log(`[StripeWebhook][${traceId}] Registering payment for invoice ${invoiceId}`);

                    await InvoiceService.registerPayment(
                        invoiceId,
                        amount,
                        'STRIPE_CHECKOUT',
                        session.id,
                        'STRIPE_SYSTEM',
                        orgId || 'UNKNOWN'
                    );
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

                console.log(`[StripeWebhook][${traceId}] Processing customer.subscription.updated for Org: ${orgId}`);

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
                            details: `[${traceId}] Processed customer.subscription.updated (New Status: ${status})`,
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

                console.log(`[StripeWebhook][${traceId}] Processing customer.subscription.deleted for Org: ${orgId}`);

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
                            details: `[${traceId}] Processed customer.subscription.deleted`,
                            userName: 'Stripe Webhook'
                        }
                    });
                }
                break;
            }

            case 'ping.e2e_test': {
                console.log(`[StripeWebhook][${traceId}] E2E Ping Event Processed`);
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                const orgId = invoice.metadata?.organizationId || (await prisma.subscription.findFirst({ where: { providerCustomerId: invoice.customer as string } }))?.organizationId;
                console.log(`[StripeWebhook][${traceId}] Payment succeeded for Org: ${orgId}`);
                if (orgId) await trackSlo('BILLING_PAYMENT', true, orgId);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                const orgId = invoice.metadata?.organizationId || (await prisma.subscription.findFirst({ where: { providerCustomerId: invoice.customer as string } }))?.organizationId;
                console.log(`[StripeWebhook][${traceId}] Payment failed for Org: ${orgId}`);
                if (orgId) await trackSlo('BILLING_PAYMENT', false, orgId, undefined, { error: 'Payment failed' });
                break;
            }

            default:
                console.log(`[StripeWebhook][${traceId}] Unhandled event type ${event.type}`);
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
        console.error(`[StripeWebhook][${traceId}] Processing Error: ${errorMessage}`);

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
