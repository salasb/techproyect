import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import type Stripe from 'stripe';
import { trackError } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
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
        const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
        const expectedE2ESecret = process.env.E2E_TEST_SECRET;

        // STRICT: No bypass in production under any circumstances
        if (!isProduction && e2eSecretStr && expectedE2ESecret && e2eSecretStr === expectedE2ESecret) {
            console.warn(`[StripeWebhook][${traceId}] BYPASS ACTIVE: Signature verification skipped for E2E test.`);
            event = JSON.parse(body) as Stripe.Event;
        } else {
            if (!sig || !endpointSecret) {
                console.error(`[StripeWebhook][${traceId}] SECURITY_ALERT: Missing signature or endpoint secret in protected environment.`);
                return Response.json({ error: 'Security validation failed' }, { status: 400 });
            }
            const stripe = getStripe();
            event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
        }
    } catch (err: any) {
        console.error(`[StripeWebhook][${traceId}] VALIDATION_FAILED: ${err.message}`);
        return Response.json({ error: `Signature verification failed` }, { status: 400 });
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

    // 3. Persist Event (Queue-First)
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

    // 4. Trigger Worker Asynchronously (Non-blocking ACK)
    const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/stripe/worker`;
    const workerSecret = process.env.INTERNAL_WORKER_SECRET || 'LOCAL_WORKER_SECRET';

    // Fire and forget
    fetch(workerUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${workerSecret}`
        },
        body: JSON.stringify({ eventId: event.id, traceId })
    }).catch(err => {
        trackError('WEBHOOK_WORKER_TRIGGER_FAILED', err, { eventId: event.id, traceId });
    });

    // 5. Immediate ACK to Stripe
    return Response.json({ received: true, queue: 'triggered', traceId });
}
