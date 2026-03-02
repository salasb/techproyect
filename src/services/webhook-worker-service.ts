import prisma from "@/lib/prisma";
import type Stripe from 'stripe';
import { SubscriptionStatus } from '@prisma/client';
import { ActivationService } from '@/services/activation-service';
import { trackSlo, trackError } from '@/lib/telemetry';
import { getStripe } from '@/lib/stripe';

export class WebhookWorkerService {
    /**
     * Processes a single Stripe event from the database.
     * v1.0: Queue-First background processing.
     */
    static async processEvent(eventId: string, traceId: string) {
        const start = Date.now();
        
        const stripeEvent = await prisma.stripeEvent.findUnique({
            where: { id: eventId }
        });

        if (!stripeEvent || stripeEvent.status === 'OK') {
            console.log(`[WebhookWorker][${traceId}] Event ${eventId} already processed or missing.`);
            return;
        }

        const event = {
            id: stripeEvent.id,
            type: stripeEvent.type,
            data: { object: stripeEvent.data }
        } as any;

        try {
            // Processing logic (formerly in route.ts)
            switch (event.type) {
                case 'checkout.session.completed': {
                    const session = event.data.object as Stripe.Checkout.Session;
                    const orgId = session.metadata?.organizationId;
                    const invoiceId = session.metadata?.invoiceId;
                    const paymentType = session.metadata?.type;
                    const sessionTraceId = session.metadata?.traceId;
                    
                    console.log(`[WebhookWorker][${traceId}] Processing checkout.session.completed for Org: ${orgId}`);

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

                        await ActivationService.trackFunnelEvent('BILLING_CONFIGURED', orgId, `billing_conf_${orgId}`, session.customer as string);
                        await ActivationService.trackFunnelEvent('CHECKOUT_COMPLETED', orgId, `checkout_${event.id}`, session.customer as string);
                        await prisma.auditLog.create({
                            data: {
                                organizationId: orgId,
                                action: 'STRIPE_WEBHOOK_PROCESSED',
                                details: `[${traceId}] Processed subscription checkout.session.completed. Origin: ${sessionTraceId}`,
                                userName: 'Stripe Webhook Worker'
                            }
                        });
                    } else if (invoiceId && paymentType === 'INVOICE_PAYMENT' && session.payment_status === 'paid') {
                        const amount = session.amount_total ? session.amount_total / 1 : 0;
                        const { InvoiceService } = await import("@/services/invoiceService");
                        
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

                    if (orgId) {
                        let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;
                        const stripeStatus = (stripeSub as any).status;
                        if (stripeStatus === 'active') status = SubscriptionStatus.ACTIVE;
                        else if (stripeStatus === 'past_due') status = SubscriptionStatus.PAST_DUE;
                        else if (stripeStatus === 'unpaid') status = SubscriptionStatus.PAUSED;
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

                        if (oldSubscription?.planCode !== (stripeSub as any).items.data[0].price.id) {
                            await prisma.auditLog.create({
                                data: {
                                    organizationId: orgId,
                                    action: 'PLAN_CHANGED',
                                    details: `Plan changed to ${(stripeSub as any).items.data[0].price.id}`,
                                    userName: 'Stripe Webhook Worker'
                                }
                            });
                        }

                        if (status === SubscriptionStatus.TRIALING && oldSubscription?.status !== SubscriptionStatus.TRIALING) {
                            await ActivationService.trackFunnelEvent('TRIAL_STARTED', orgId, `trial_start_${event.id}`);
                        }
                        if (status === SubscriptionStatus.ACTIVE && oldSubscription?.status !== SubscriptionStatus.ACTIVE) {
                            const { DunningService } = await import("@/services/dunning-service");
                            await DunningService.handlePaymentSuccess(orgId);
                            await ActivationService.trackFunnelEvent('SUBSCRIPTION_ACTIVE', orgId, `sub_active_${event.id}`);
                        }
                    }
                    break;
                }

                case 'invoice.payment_succeeded': {
                    const invoice = event.data.object as Stripe.Invoice;
                    let orgId = invoice.metadata?.organizationId;
                    
                    if (!orgId) {
                        const sub = await prisma.subscription.findFirst({ where: { providerCustomerId: invoice.customer as string } });
                        orgId = sub?.organizationId;
                    }

                    if (orgId) {
                        const { DunningService } = await import("@/services/dunning-service");
                        await DunningService.handlePaymentSuccess(orgId);
                        await ActivationService.trackFunnelEvent('PAYMENT_SUCCEEDED', orgId, `payment_success_${event.id}`);
                        await trackSlo('BILLING_PAYMENT', true, orgId);
                    }
                    break;
                }

                case 'invoice.payment_failed': {
                    const invoice = event.data.object as Stripe.Invoice;
                    let orgId = invoice.metadata?.organizationId;
                    
                    if (!orgId) {
                        const sub = await prisma.subscription.findFirst({ where: { providerCustomerId: invoice.customer as string } });
                        orgId = sub?.organizationId;
                    }

                    if (orgId) {
                        const { DunningService } = await import("@/services/dunning-service");
                        await DunningService.handlePaymentFailure(orgId, invoice.id);
                        await ActivationService.trackFunnelEvent('PAYMENT_FAILED', orgId, `payment_fail_${event.id}`);
                        await trackSlo('BILLING_PAYMENT', false, orgId, undefined, { error: 'Payment failed' });
                    }
                    break;
                }
            }

            // Success Update
            await prisma.stripeEvent.update({
                where: { id: eventId },
                data: {
                    processed: true,
                    status: 'OK',
                    processedAt: new Date(),
                    durationMs: Date.now() - start,
                    error: null
                }
            });

        } catch (error: any) {
            await trackError('WEBHOOK_WORKER_FAILURE', error, { eventId, traceId });
            await prisma.stripeEvent.update({
                where: { id: eventId },
                data: {
                    processed: false,
                    status: 'ERROR',
                    error: error.message
                }
            });
        }
    }
}
