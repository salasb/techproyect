import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import type Stripe from 'stripe';
import { SubscriptionStatus } from '@prisma/client';

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

                    await prisma.subscription.update({
                        where: { organizationId: orgId },
                        data: {
                            status: status,
                            currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
                            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                            seatLimit: stripeSub.items.data[0]?.quantity || 1,
                        }
                    });
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const stripeSub = event.data.object as Stripe.Subscription;
                const orgId = stripeSub.metadata?.organizationId;

                if (orgId) {
                    await prisma.subscription.update({
                        where: { organizationId: orgId },
                        data: {
                            status: SubscriptionStatus.CANCELED,
                            providerSubscriptionId: null,
                        }
                    });
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
