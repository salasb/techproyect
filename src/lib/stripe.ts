import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

let stripeInstance: Stripe | null = null;

export const getStripe = (): Stripe => {
    if (stripeInstance) return stripeInstance;

    if (!stripeSecretKey) {
        throw new Error('STRIPE_SECRET_KEY is not defined. Ensure it is set in your environment variables.');
    }

    stripeInstance = new Stripe(stripeSecretKey, {
        apiVersion: '2026-01-28.clover',
        typescript: true,
    });

    return stripeInstance;
};

// For backward compatibility while we refactor usages
export const stripe = {} as Stripe; // Will be replaced by getStripe() calls
