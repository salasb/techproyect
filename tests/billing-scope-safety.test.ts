import { describe, it, expect, vi } from 'vitest';
import { createCheckoutSession, createPortalSession } from '../src/actions/billing';
import { requireOperationalScope } from '../src/lib/auth/server-resolver';

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

describe('Billing Scope Safety (v1.8.2)', () => {
    it('should block checkout session if scope is invalid (ScopeError)', async () => {
        // Mock a failure in the scope resolver (e.g., user domain hopping or no org selected)
        vi.mocked(requireOperationalScope).mockRejectedValue(new Error('SCOPE_ERROR: No active organization context'));

        await expect(createCheckoutSession('price_123')).rejects.toThrow('SCOPE_ERROR: No active organization context');
    });

    it('should block portal session if scope is invalid (ScopeError)', async () => {
        // Mock a failure in the scope resolver
        vi.mocked(requireOperationalScope).mockRejectedValue(new Error('SCOPE_ERROR: No active organization context'));

        await expect(createPortalSession()).rejects.toThrow('SCOPE_ERROR: No active organization context');
    });
});
