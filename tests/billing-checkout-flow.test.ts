import { describe, it, expect, vi } from 'vitest';
import { createCheckoutSession } from '../src/actions/billing';
import { requireOperationalScope } from '../src/lib/auth/server-resolver';
import { getStripe } from '../src/lib/stripe';
import { createClient } from '../src/lib/supabase/server';
import prisma from '../src/lib/prisma';
import { redirect } from 'next/navigation';

// Mock dependencies
vi.mock('../src/lib/auth/server-resolver', () => ({
    requireOperationalScope: vi.fn()
}));

vi.mock('../src/lib/stripe', () => ({
    getStripe: vi.fn()
}));

vi.mock('../src/lib/supabase/server', () => ({
    createClient: vi.fn()
}));

vi.mock('../src/lib/prisma', () => ({
    default: {
        subscription: {
            findUnique: vi.fn()
        },
        auditLog: {
            create: vi.fn()
        }
    }
}));

vi.mock('next/navigation', () => ({
    redirect: vi.fn()
}));

describe('Billing Checkout Flow (Multi-Org Isolation)', () => {
    it('should inject correct organizationId in Stripe metadata', async () => {
        const mockOrgId = 'org_123';
        const mockUserId = 'user_123';
        const mockPriceId = 'price_abc';
        const mockSessionUrl = 'https://stripe.com/checkout/test';

        // 1. Setup Mocks
        vi.mocked(requireOperationalScope).mockResolvedValue({
            orgId: mockOrgId,
            role: 'ADMIN',
            plan: 'PRO'
        } as any);

        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: { id: mockUserId, email: 'test@example.com' } } })
            }
        };
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const mockStripe = {
            checkout: {
                sessions: {
                    create: vi.fn().mockResolvedValue({ url: mockSessionUrl })
                }
            }
        };
        vi.mocked(getStripe).mockReturnValue(mockStripe as any);

        vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

        // 2. Execute Action
        try {
            await createCheckoutSession(mockPriceId);
        } catch (e) {
            // redirect() throws an error in Next.js tests/actions usually, but we catch it or ignore if mocked
        }

        // 3. Assertions
        expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
            metadata: {
                organizationId: mockOrgId,
                userId: mockUserId
            },
            subscription_data: {
                metadata: {
                    organizationId: mockOrgId
                }
            }
        }));

        expect(vi.mocked(redirect)).toHaveBeenCalledWith(mockSessionUrl);
    });
});
