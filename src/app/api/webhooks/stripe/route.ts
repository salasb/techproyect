import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import type Stripe from 'stripe';
import { SubscriptionStatus } from '@prisma/client';
import { ActivationService } from '@/services/activation-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const start = Date.now();
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

    // 1. Idempotency Check & Initialization
    const existingEvent = await prisma.stripeEvent.findUnique({
        where: { id: event.id }
    });

    if (existingEvent?.status === 'OK') {
        return Response.json({ received: true, duplication: true });
    }

    // Upsert as PENDING (or update if retrying from ERROR)
    await prisma.stripeEvent.upsert({
        where: { id: event.id },
        update: {
            status: 'PENDING',
            description: `Retry attempt at ${new Date().toISOString()}`
        },
        create: {
            id: event.id,
            type: event.type,
            processed: false,
            status: 'PENDING',
            data: event.data.object as any // Snapshot payload
        }
    });

    try {
        // 2. Process Event
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const orgId = session.metadata?.organizationId;
                const invoiceId = session.metadata?.invoiceId;

                // Handle Subscription Checkout
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

                // Handle One-Time Invoice Payment
                else if (invoiceId && session.payment_status === 'paid') {
                    const amount = session.amount_total ? session.amount_total / 100 : 0; // Stripe is in cents

                    // Verify invoice exists
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

                        // Log Audit
                        const { AuditService } = await import("@/services/auditService");
                        const status = newAmountPaid >= invoice.amountInvoicedGross ? ' (Pagada Totalmente)' : ' (Pago Parcial)';

                        await AuditService.logAction(
                            invoice.projectId,
                            'INVOICE_PAYMENT',
                            `Pago online registrado vía Stripe por $${amount.toLocaleString()}${status}`,
                            {
                                name: 'Stripe System',
                                ip: 'Stripe Webhook',
                                userAgent: 'Stripe/1.0'
                            }
                        );
                    }
                }
                break;
            }

            case 'customer.subscription.updated': {
                const stripeSub = event.data.object as Stripe.Subscription;
                // Important: Retrieve metadata from Stripe API if missing in event object (sometimes happens)
                // But usually event object is enough.
                // Fallback: DB lookup by subscription ID?
                // For now rely on metadata or finding subscription by providerSubscriptionId
                let orgId = stripeSub.metadata?.organizationId;

                if (!orgId) {
                    const sub = await prisma.subscription.findFirst({
                        where: { providerSubscriptionId: stripeSub.id }
                    });
                    if (sub) orgId = sub.organizationId;
                }

                if (orgId) {
                    let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;
                    // Strict mapping
                    switch (stripeSub.status) {
                        case 'active': status = SubscriptionStatus.ACTIVE; break;
                        case 'past_due': status = SubscriptionStatus.PAST_DUE; break;
                        case 'unpaid': status = SubscriptionStatus.PAST_DUE; break;
                        case 'canceled': status = SubscriptionStatus.CANCELED; break;
                        case 'incomplete_expired': status = SubscriptionStatus.CANCELED; break;
                        case 'trialing': status = SubscriptionStatus.TRIALING; break;
                        case 'paused': status = SubscriptionStatus.PAUSED; break;
                        default: status = SubscriptionStatus.ACTIVE; // Fallback? Or keep existing?
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

                    // [Funnel] Event Mapping Logic (Preserved)
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
                let orgId = stripeSub.metadata?.organizationId;
                if (!orgId) {
                    const sub = await prisma.subscription.findFirst({ where: { providerSubscriptionId: stripeSub.id } });
                    if (sub) orgId = sub.organizationId;
                }

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
                let orgId = stripeSub.metadata?.organizationId;
                if (!orgId) {
                    const sub = await prisma.subscription.findFirst({ where: { providerSubscriptionId: stripeSub.id } });
                    if (sub) orgId = sub.organizationId;
                }

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
                const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

                // Try to find org via subscription if metadata missing
                let orgId: string | undefined;
                if (customerId) {
                    const customer = await stripe.customers.retrieve(customerId);
                    if (!customer.deleted) {
                        orgId = (customer as any).metadata?.organizationId;
                    }
                }

                // Fallback: Find by Stripe Customer ID in Subscription table
                if (!orgId && customerId) {
                    const sub = await prisma.subscription.findFirst({ where: { providerCustomerId: customerId } });
                    if (sub) orgId = sub.organizationId;
                }

                if (orgId) {
                    const { DunningService } = await import("@/services/dunning-service");
                    await DunningService.handlePaymentFailure(orgId, invoice.id);
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                // Only relevant if it's a subscription invoice?
                // Logic mostly for Dunning recovery (resetting status)
                const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
                let orgId: string | undefined;
                if (customerId) {
                    const customer = await stripe.customers.retrieve(customerId);
                    if (!customer.deleted) {
                        orgId = (customer as any).metadata?.organizationId;
                    }
                }
                if (!orgId && customerId) {
                    const sub = await prisma.subscription.findFirst({ where: { providerCustomerId: customerId } });
                    if (sub) orgId = sub.organizationId;
                }

                if (orgId) {
                    const { DunningService } = await import("@/services/dunning-service");
                    await DunningService.handlePaymentSuccess(orgId);
                }
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        // 3. Success Update
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

    } catch (error: unknown) {
        // 4. Error Handling
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Webhook Processing Error [${event.id}]: ${errorMessage}`);

        await prisma.stripeEvent.update({
            where: { id: event.id },
            data: {
                processed: false, // Keep false? Or true but with Error status?
                // If processed=true, my idempotency check returns 200.
                // If status=ERROR, I want to see it in dashboard.
                // If I WANT Retry, I should keep processed=false or handle status check.
                // My check: if (existingEvent?.status === 'OK')
                // So if status=ERROR, it proceeds to retry.
                status: 'ERROR',
                error: errorMessage,
                processedAt: new Date(),
                durationMs: Date.now() - start
            }
        });

        // Return 500 to trigger Stripe Retry
        return Response.json({ error: 'Webhook processing failed', details: errorMessage }, { status: 500 });
    }
}
