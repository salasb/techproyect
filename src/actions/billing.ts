'use server';

import { getStripe } from '@/lib/stripe';
import { requireOperationalScope } from '@/lib/auth/server-resolver';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Creates a Stripe Checkout Session for a subscription
 */
export async function createCheckoutSession(priceId: string) {
    const stripe = getStripe();
    const scope = await requireOperationalScope();
    const orgId = scope.orgId;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Get or create customer
    const subscription = await prisma.subscription.findUnique({
        where: { organizationId: orgId }
    });

    const session = await stripe.checkout.sessions.create({
        customer: subscription?.providerCustomerId || undefined,
        customer_email: !subscription?.providerCustomerId ? user.email : undefined,
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        success_url: `${APP_URL}/dashboard?checkout=success`,
        cancel_url: `${APP_URL}/settings/billing?checkout=cancel`,
        metadata: {
            organizationId: orgId,
            userId: user.id
        },
        subscription_data: {
            metadata: {
                organizationId: orgId
            }
        }
    });

    if (!session.url) throw new Error("Could not create checkout session");

    await prisma.auditLog.create({
        data: {
            organizationId: orgId,
            userId: user.id,
            action: 'BILLING_CHECKOUT_CREATED',
            details: `Checkout session created for price ${priceId}`,
            userName: user.email
        }
    });

    redirect(session.url);
}

/**
 * Creates a Stripe Customer Portal Session
 */
export async function createPortalSession() {
    const stripe = getStripe();
    const scope = await requireOperationalScope();
    const orgId = scope.orgId;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const subscription = await prisma.subscription.findUnique({
        where: { organizationId: orgId }
    });

    if (!subscription?.providerCustomerId) {
        throw new Error("No Stripe customer found for this organization");
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: subscription.providerCustomerId,
        return_url: `${APP_URL}/settings/billing`,
    });

    await prisma.auditLog.create({
        data: {
            organizationId: orgId,
            userId: user?.id,
            action: 'BILLING_PORTAL_ACCESSED',
            details: `Customer portal accessed for customer ${subscription.providerCustomerId}`,
            userName: user?.email
        }
    });

    redirect(session.url);
}
