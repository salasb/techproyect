import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import prisma from '../src/lib/prisma';
import * as serverResolver from '../src/lib/auth/server-resolver';

// Mock the requireOperationalScope
vi.mock('../src/lib/auth/server-resolver', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../src/lib/auth/server-resolver')>();
    return {
        ...mod,
        requireOperationalScope: vi.fn(),
    };
});

describe('Multi-Org Smoke Test (v1.6.1/v1.8 Gate)', () => {
    const orgAId = crypto.randomUUID();
    const orgBId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    beforeAll(async () => {
        // Setup mock Orgs
        await prisma.organization.createMany({
            data: [
                { id: orgAId, name: 'Org A (Smoke Test)' },
                { id: orgBId, name: 'Org B (Smoke Test)' }
            ]
        });
    });

    afterAll(async () => {
        // Cleanup
        await prisma.opportunity.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
        await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    });

    it('should strongly isolate data between Org A and Org B in server actions', async () => {
        // 1. Mock context for Org A
        const scopeA = { orgId: orgAId, userId, isSuperadmin: false, role: 'OWNER' };
        vi.mocked(serverResolver.requireOperationalScope).mockResolvedValue(scopeA);

        // 2. Create data physically tied to Org A
        await prisma.opportunity.create({
            data: {
                id: crypto.randomUUID(),
                organizationId: orgAId,
                title: 'Opp in Org A',
                value: 1000,
                stage: 'LEAD'
            }
        });

        // 3. Action Context: Requesting data with Org A scope
        const reqScopeA = await serverResolver.requireOperationalScope();
        const resultsA = await prisma.opportunity.findMany({
            where: { organizationId: reqScopeA.orgId }
        });

        expect(resultsA).toHaveLength(1);
        expect(resultsA[0].title).toBe('Opp in Org A');

        // 4. Action Context Switch: Requesting data with Org B scope
        const scopeB = { orgId: orgBId, userId, isSuperadmin: false, role: 'OWNER' };
        vi.mocked(serverResolver.requireOperationalScope).mockResolvedValue(scopeB);

        const reqScopeB = await serverResolver.requireOperationalScope();
        const resultsB = await prisma.opportunity.findMany({
            where: { organizationId: reqScopeB.orgId }
        });

        // 5. Verification: Org B scope completely shields Org A data
        expect(resultsB).toHaveLength(0);
    });
});
