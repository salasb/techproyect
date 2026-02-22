import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { POST } from '../src/app/api/webhooks/stripe/route';

// 1. Mock Next.js Headers
vi.mock('next/headers', () => ({
    headers: vi.fn().mockResolvedValue({
        get: vi.fn().mockReturnValue('mock-signature')
    })
}));

// 2. Mock Stripe Library
vi.mock('../src/lib/stripe', () => ({
    getStripe: vi.fn().mockReturnValue({
        webhooks: {
            constructEvent: vi.fn((body, sig, secret) => JSON.parse(body))
        },
        subscriptions: {
            retrieve: vi.fn().mockResolvedValue({
                id: 'sub_test',
                items: { data: [{ quantity: 5 }] },
                current_period_end: Math.floor(Date.now() / 1000) + 3600
            })
        }
    })
}));

// 3. Mock Prisma Client
vi.mock('../src/lib/prisma', () => ({
    default: {
        stripeEvent: {
            findUnique: vi.fn(),
            upsert: vi.fn(),
            update: vi.fn()
        },
        subscription: {
            findFirst: vi.fn(),
            update: vi.fn(),
            findUnique: vi.fn()
        },
        auditLog: {
            create: vi.fn()
        }
    },
    SubscriptionStatus: {
        ACTIVE: 'ACTIVE',
        TRIALING: 'TRIALING',
        PAST_DUE: 'PAST_DUE',
        CANCELED: 'CANCELED',
        PAUSED: 'PAUSED'
    }
}));

// Import mocked prisma for assertions
import prisma from '../src/lib/prisma';

// 4. Mock Auth/Resolver
vi.mock('../src/lib/auth/server-resolver', () => ({
    requireOperationalScope: vi.fn(),
    getOrganizationId: vi.fn(),
}));

// 5. Mock ActivationService
vi.mock('../src/services/activation-service', () => ({
    ActivationService: {
        trackFunnelEvent: vi.fn().mockResolvedValue({})
    }
}));

process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

describe('Stripe Webhook Idempotency (Full Mock Mode)', () => {
    const orgId = 'org_abc_123';
    const mockCustomerId = 'cus_123';
    const eventId = 'evt_processed_once';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should process a webhook and then catch duplication on second attempt', async () => {
        const mockPayload = {
            id: eventId,
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: 'cs_test_123',
                    customer: mockCustomerId,
                    subscription: 'sub_test_123',
                    metadata: { organizationId: orgId }
                }
            }
        };

        // --- ATTEMPT 1: Fresh Event ---
        // Mock DB: Event doesn't exist yet
        vi.mocked(prisma.stripeEvent.findUnique).mockResolvedValue(null);

        const req1 = new Request('http://localhost/api/webhooks/stripe', {
            method: 'POST',
            body: JSON.stringify(mockPayload)
        });

        const res1 = await POST(req1);
        expect(res1.status).toBe(200);

        // Verify Prisma interactions for processing
        expect(prisma.stripeEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: eventId }
        }));
        expect(prisma.subscription.update).toHaveBeenCalled();
        expect(prisma.stripeEvent.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: 'OK', processed: true })
        }));

        // --- ATTEMPT 2: Duplicate Event ---
        // Mock DB: Event already exists and is OK
        vi.mocked(prisma.stripeEvent.findUnique).mockResolvedValue({
            id: eventId,
            status: 'OK',
            processed: true
        } as any);

        const req2 = new Request('http://localhost/api/webhooks/stripe', {
            method: 'POST',
            body: JSON.stringify(mockPayload)
        });

        const res2 = await POST(req2);
        const data2 = await res2.json();

        expect(res2.status).toBe(200);
        expect(data2.duplication).toBe(true);

        // Ensure update logic was NOT called again
        expect(prisma.subscription.update).toHaveBeenCalledTimes(1);
    });
});
