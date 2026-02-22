import { describe, it, expect, vi } from 'vitest';
import { GET } from '../src/app/api/_debug/workspace-doctor/route';
import prisma from '../src/lib/prisma';
import { createClient } from '../src/lib/supabase/server';
import { cookies, headers } from 'next/headers';
import { getWorkspaceState } from '../src/lib/auth/workspace-resolver';

// 1. Mock Dependencies
vi.mock('../src/lib/prisma', () => ({
    default: {
        profile: { findUnique: vi.fn(), count: vi.fn() },
        organizationMember: { findMany: vi.fn() },
        organization: { findUnique: vi.fn(), count: vi.fn() },
        project: { count: vi.fn() },
        quote: { count: vi.fn() },
        invoice: { count: vi.fn() },
        subscription: { findUnique: vi.fn() }
    }
}));

vi.mock('../src/lib/supabase/server', () => ({
    createClient: vi.fn()
}));

vi.mock('next/headers', () => ({
    headers: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue('localhost') }),
    cookies: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'org_123' }) })
}));

vi.mock('../src/lib/auth/workspace-resolver', () => ({
    getWorkspaceState: vi.fn()
}));

process.env.DEBUG_WORKSPACE = '1';

describe('Workspace Doctor Billing Diagnostic (D4)', () => {
    it('should correctly report active subscription and billing status', async () => {
        const mockUserId = 'user_abc';
        const mockOrgId = 'org_123';

        // Setup Auth Mock
        vi.mocked(createClient).mockResolvedValue({
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: mockUserId, email: 'admin@test.com' } } }) }
        } as any);

        // Setup Workspace State Mock
        vi.mocked(getWorkspaceState).mockResolvedValue({
            activeOrgId: mockOrgId,
            status: 'AUTH_WORKSPACE',
            isSuperadmin: false
        } as any);

        // Setup Prisma Mock for Billing
        vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
            status: 'ACTIVE',
            providerCustomerId: 'cus_stripe_123',
            planCode: 'PRO_MONTHLY',
            currentPeriodEnd: new Date('2026-12-31')
        } as any);

        vi.mocked(prisma.profile.findUnique).mockResolvedValue({ id: mockUserId } as any);
        vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([{ organizationId: mockOrgId }] as any);
        vi.mocked(prisma.organization.findUnique).mockResolvedValue({ name: 'Test Org' } as any);

        // Execute Request
        const req = new Request('http://localhost/api/_debug/workspace-doctor');
        const res = await GET(req);
        const data = await res.json();

        // Assertions
        expect(res.status).toBe(200);
        expect(data.billing).toEqual(expect.objectContaining({
            hasSubscriptionRecord: true,
            status: 'ACTIVE',
            hasProviderCustomer: true,
            planCode: 'PRO_MONTHLY'
        }));

        expect(data.operatingContext.activeOrgId).toBe(mockOrgId);
    });
});
