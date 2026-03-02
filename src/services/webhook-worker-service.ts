import prisma from "@/lib/prisma";
import type Stripe from 'stripe';
import { SubscriptionStatus } from '@prisma/client';
import { ActivationService } from '@/services/activation-service';
import { trackSlo, trackError } from '@/lib/telemetry';
import { getStripe } from '@/lib/stripe';

export class WebhookWorkerService {
    /**
     * Processes a single Stripe event from the database.
     * v1.1: Hardened Queue-First processing with retries, DLQ and locking.
     */
    static async processEvent(eventId: string, traceId: string) {
        const start = Date.now();
        const MAX_ATTEMPTS = 5;
        
        // 1. Concurrency-Safe Lock (Lease)
        // We only allow picking events in PENDING or ERROR state.
        const locked = await prisma.stripeEvent.updateMany({
            where: { 
                id: eventId, 
                status: { in: ['PENDING', 'ERROR'] } 
            },
            data: { 
                status: 'PROCESSING'
            }
        });

        if (locked.count === 0) {
            console.log(`[WebhookWorker][${traceId}] Event ${eventId} already being processed or finished.`);
            return;
        }

        // Fetch the event after locking to get current attempt count
        const stripeEvent = await prisma.stripeEvent.findUnique({
            where: { id: eventId }
        });

        if (!stripeEvent) return;

        const event = {
            id: stripeEvent.id,
            type: stripeEvent.type,
            data: { object: stripeEvent.data }
        } as any;

        try {
            // 2. Increment attempt count
            await prisma.stripeEvent.update({
                where: { id: eventId },
                data: { attempts: { increment: 1 } }
            });

            // 3. Processing logic
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

            // 4. Success Update
            await prisma.stripeEvent.update({
                where: { id: eventId },
                data: {
                    processed: true,
                    status: 'OK',
                    processedAt: new Date(),
                    durationMs: Date.now() - start,
                    error: null,
                    nextRetryAt: null
                }
            });

        } catch (error: any) {
            const currentAttempts = stripeEvent.attempts + 1;
            const isLastAttempt = currentAttempts >= MAX_ATTEMPTS;
            const nextStatus = isLastAttempt ? 'DLQ' : 'ERROR';
            
            // Exponential backoff: 1m, 4m, 9m, 16m...
            const backoffMinutes = Math.pow(currentAttempts, 2);
            const nextRetryAt = isLastAttempt ? null : new Date(Date.now() + backoffMinutes * 60000);

            await trackError('WEBHOOK_WORKER_FAILURE', error, { eventId, traceId, attempt: currentAttempts, nextStatus });
            
            await prisma.stripeEvent.update({
                where: { id: eventId },
                data: {
                    processed: false,
                    status: nextStatus,
                    error: error.message,
                    nextRetryAt
                }
            });
        }
    }

    /**
     * Replays a specific event. Resets status to PENDING and triggers worker.
     */
    static async replayEvent(eventId: string, adminUserId: string) {
        const traceId = `RPLY-${Math.random().toString(36).substring(7).toUpperCase()}`;
        
        const event = await prisma.stripeEvent.findUnique({ where: { id: eventId } });
        if (!event) throw new Error("Event not found");

        await prisma.stripeEvent.update({
            where: { id: eventId },
            data: {
                status: 'PENDING',
                error: null,
                processed: false,
                attempts: 0
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId: event.orgId || 'SYSTEM',
                userId: adminUserId,
                action: 'WEBHOOK_REPLAY_TRIGGERED',
                details: `[${traceId}] Manual replay triggered for event ${eventId}`
            }
        });

        // Trigger worker
        await this.processEvent(eventId, traceId);
        
        return { success: true, traceId };
    }
}
