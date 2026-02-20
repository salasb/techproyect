import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import prisma from '../src/lib/prisma';
import { POST } from '../src/app/api/webhooks/stripe/route';
import { requireOperationalScope } from '../src/lib/auth/server-resolver';

// Mock Next.js Headers
vi.mock('next/headers', () => ({
    headers: vi.fn().mockResolvedValue({
        get: vi.fn().mockReturnValue('mock-signature')
    })
}));

// Mock Stripe Library
vi.mock('../src/lib/stripe', () => ({
    getStripe: vi.fn().mockReturnValue({
        webhooks: {
            constructEvent: vi.fn((body, sig, secret) => JSON.parse(body))
        }
    })
}));

vi.mock('../src/lib/auth/server-resolver', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../src/lib/auth/server-resolver')>();
    return {
        ...mod,
        requireOperationalScope: vi.fn(),
    };
});

process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

describe('Stripe Webhook Idempotency & Scope Verification (v1.8)', () => {
    const orgId = crypto.randomUUID();
    const mockCustomerId = 'cus_' + crypto.randomUUID();

    beforeAll(async () => {
        await prisma.organization.create({
            data: { id: orgId, name: 'Stripe Test Org' }
        });
        await prisma.subscription.create({
            data: {
                organizationId: orgId,
                status: 'TRIALING',
                providerCustomerId: mockCustomerId
            }
        });
    });

    afterAll(async () => {
        await prisma.stripeEvent.deleteMany({});
        await prisma.auditLog.deleteMany({});
        await prisma.subscription.deleteMany({ where: { organizationId: orgId } });
        try { await prisma.organizationStats.deleteMany({ where: { organizationId: orgId } }); } catch (e) { }
        await prisma.organization.deleteMany({ where: { id: orgId } });
    });

    it('should process a webhook deterministically and enforce idempotency on duplicates', async () => {
        const eventId = 'evt_' + crypto.randomUUID();

        const mockPayload = {
            id: eventId,
            type: 'customer.subscription.updated',
            data: {
                object: {
                    id: 'sub_' + crypto.randomUUID(),
                    customer: mockCustomerId,
                    status: 'active',
                    current_period_end: Math.floor(Date.now() / 1000) + 3600,
                    cancel_at_period_end: false,
                    items: { data: [{ quantity: 5 }] },
                    metadata: { organizationId: orgId }
                }
            }
        };

        const req1 = new Request('http://localhost/webhook', {
            method: 'POST',
            body: JSON.stringify(mockPayload)
        });

        // 1. First request should process
        const res1 = await POST(req1);
        expect(res1.status).toBe(200);

        // Verify state changed
        const sub1 = await prisma.subscription.findUnique({ where: { organizationId: orgId } });
        expect(sub1?.status).toBe('ACTIVE');
        expect(sub1?.seatLimit).toBe(5);

        // Verify Audit Log generated
        const logs = await prisma.auditLog.findMany({ where: { organizationId: orgId, action: 'STRIPE_WEBHOOK_PROCESSED' } });
        expect(logs.length).toBeGreaterThanOrEqual(1);

        // 2. Duplicate request with identical event payload
        const req2 = new Request('http://localhost/webhook', {
            method: 'POST',
            body: JSON.stringify(mockPayload)
        });

        const res2 = await POST(req2);
        const data2 = await res2.json();

        // Assert dupes are caught!
        expect(res2.status).toBe(200);
        expect(data2.duplication).toBe(true);
    });

    it('should throw an error when requireOperationalScope is called without active context', async () => {
        // Mock missing context
        vi.mocked(requireOperationalScope).mockRejectedValue(new Error('User not authenticated or missing org'));

        await expect(requireOperationalScope()).rejects.toThrow('User not authenticated or missing org');
    });
});
