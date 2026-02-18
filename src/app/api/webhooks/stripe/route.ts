import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import type Stripe from 'stripe';
import { SubscriptionStatus } from '@prisma/client';
import { ActivationService } from '@/services/activation-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const stripe = getStripe();
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const body = await req.text();
    const sig = (await headers()).get('stripe-signature');

    let event: Stripe.Event;

    try {
        if (!sig || !endpointSecret) {
            console.error('Webhook Error: Missing signature or secret');
            return Response.json({ error: 'Missing signature or secret' }, { status: 400 });
        }
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook Signature Error: ${err.message}`);
        return Response.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // 1. Idempotency Check
    const existingEvent = await prisma.stripeEvent.findUnique({
        where: { id: event.id }
    });

    if (existingEvent?.processed) {
        return Response.json({ received: true, duplication: true });
    }

    // Record event
    await prisma.stripeEvent.upsert({
        where: { id: event.id },
        update: {},
        create: {
            id: event.id,
            type: event.type,
            processed: false
        }
    });

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const orgId = session.metadata?.organizationId;

                if (orgId && session.subscription) {
                    const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);

                    await prisma.subscription.update({
                        where: { organizationId: orgId },
                        data: {
                            status: SubscriptionStatus.ACTIVE,
                            providerSubscriptionId: stripeSub.id,
                            providerCustomerId: session.customer as string,
                            currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
                            seatLimit: stripeSub.items.data[0]?.quantity || 1,
                        }
                    });

                    // [Funnel] Checkout Completed
                    await ActivationService.trackFunnelEvent('CHECKOUT_COMPLETED', orgId, `checkout_${event.id}`, session.customer as string);
                }
                break;
            }

            case 'customer.subscription.updated': {
                const stripeSub = event.data.object as Stripe.Subscription;
                const orgId = stripeSub.metadata?.organizationId;

                if (orgId) {
                    let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;
                    if (stripeSub.status === 'past_due' || stripeSub.status === 'unpaid') {
                        status = SubscriptionStatus.PAST_DUE;
                    } else if (stripeSub.status === 'canceled' || stripeSub.status === 'incomplete_expired') {
                        status = SubscriptionStatus.CANCELED;
                    } else if (stripeSub.status === 'trialing') {
                        status = SubscriptionStatus.TRIALING;
                    } else if (stripeSub.status === 'paused') {
                        status = SubscriptionStatus.PAUSED;
                    }

                    const oldSubscription = await prisma.subscription.findUnique({ where: { organizationId: orgId } });

                    await prisma.subscription.update({
                        where: { organizationId: orgId },
                        data: {
                            status: status,
                            currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
                            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                            seatLimit: stripeSub.items.data[0]?.quantity || 1,
                        }
                    });

                    // [Funnel] Event Mapping
                    if (status === SubscriptionStatus.TRIALING && oldSubscription?.status !== SubscriptionStatus.TRIALING) {
                        await ActivationService.trackFunnelEvent('TRIAL_STARTED', orgId, `trial_start_${event.id}`);
                    }
                    if (status === SubscriptionStatus.ACTIVE && oldSubscription?.status !== SubscriptionStatus.ACTIVE) {
                        await ActivationService.trackFunnelEvent('SUBSCRIPTION_ACTIVE', orgId, `sub_active_${event.id}`);
                        if (oldSubscription?.status === SubscriptionStatus.PAST_DUE || oldSubscription?.status === SubscriptionStatus.PAUSED) {
                            await ActivationService.trackFunnelEvent('PAUSED_EXITED', orgId, `paused_exit_${event.id}`);
                        }
                    }
                    if ((status === SubscriptionStatus.PAST_DUE || status === SubscriptionStatus.PAUSED) && oldSubscription?.status === SubscriptionStatus.ACTIVE) {
                        await ActivationService.trackFunnelEvent('PAUSED_ENTERED', orgId, `paused_enter_${event.id}`);
                    }
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const stripeSub = event.data.object as Stripe.Subscription;
                const orgId = stripeSub.metadata?.organizationId;

                if (orgId) {
                    const oldSub = await prisma.subscription.findUnique({ where: { organizationId: orgId } });

                    await prisma.subscription.update({
                        where: { organizationId: orgId },
                        data: {
                            status: SubscriptionStatus.CANCELED,
                            providerSubscriptionId: null,
                        }
                    });

                    await ActivationService.trackFunnelEvent('SUBSCRIPTION_CANCELED', orgId, `sub_del_${event.id}`);
                    if (oldSub?.status === SubscriptionStatus.TRIALING) {
                        await ActivationService.trackFunnelEvent('TRIAL_EXPIRED', orgId, `trial_exp_${event.id}`);
                    }
                }
                break;
            }

            case 'customer.subscription.trial_will_end': {
                const stripeSub = event.data.object as Stripe.Subscription;
                const orgId = stripeSub.metadata?.organizationId;

                if (orgId) {
                    // Fetch OWNER to send email
                    const owner = await prisma.profile.findFirst({
                        where: {
                            organizationId: orgId,
                            role: 'OWNER'
                        }
                    });

                    if (owner) {
                        const { LifecycleEmailService } = await import("@/services/lifecycle-email");
                        // DedupeKey: StripeEventID ensures we don't send multiple for same event
                        await LifecycleEmailService.sendLifecycleEmail({
                            organizationId: orgId,
                            userId: owner.id,
                            templateKey: 'TRIAL_3D',
                            dedupeKey: `TRIAL_WILL_END_${event.id}`,
                            isBilling: true
                        });

                        // [Funnel] Trial Will End
                        await ActivationService.trackFunnelEvent('TRIAL_WILL_END', orgId, `funnel_twe_${event.id}`);
                    }
                }
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                const customer = await stripe.customers.retrieve(invoice.customer as string);
                const orgId = (customer as any).metadata?.organizationId;

                if (orgId) {
                    await ActivationService.trackFunnelEvent('PAYMENT_FAILED', orgId, `payment_fail_${event.id}`, undefined, { invoiceId: invoice.id });
                }
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        // Mark as processed
        await prisma.stripeEvent.update({
            where: { id: event.id },
            data: { processed: true }
        });

        return Response.json({ received: true });
    } catch (error: any) {
        console.error(`Webhook Processing Error [${event.id}]: ${error.message}`);
        return Response.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
