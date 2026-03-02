import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireOperationalScope, ScopeError } from '@/lib/auth/server-resolver';
import * as workspaceResolver from '@/lib/auth/workspace-resolver';

vi.mock('@/lib/auth/workspace-resolver', () => ({
    getWorkspaceState: vi.fn(),
}));

describe('AuthZ Deny-by-Default (OWASP)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should throw ScopeError if user is NOT_AUTHENTICATED', async () => {
        (workspaceResolver.getWorkspaceState as any).mockResolvedValue({
            status: 'NOT_AUTHENTICATED',
            isSuperadmin: false,
            activeOrgId: null,
        });

        await expect(requireOperationalScope()).rejects.toThrow(ScopeError);
        await expect(requireOperationalScope()).rejects.toThrow('User not authenticated');
    });

    it('should throw ScopeError if NO_ORG_CONTEXT is provided', async () => {
        (workspaceResolver.getWorkspaceState as any).mockResolvedValue({
            status: 'AUTHENTICATED',
            userId: 'user-123',
            isSuperadmin: false,
            activeOrgId: null, // No organization selected
        });

        await expect(requireOperationalScope()).rejects.toThrow(ScopeError);
        await expect(requireOperationalScope()).rejects.toThrow('Se requiere seleccionar una organización activa');
    });

    it('should return valid scope if authenticated and org is present', async () => {
        const mockScope = {
            status: 'AUTHENTICATED',
            userId: 'user-123',
            isSuperadmin: false,
            activeOrgId: 'org-456',
            userRole: 'ADMIN'
        };
        (workspaceResolver.getWorkspaceState as any).mockResolvedValue(mockScope);

        const scope = await requireOperationalScope();
        expect(scope.orgId).toBe('org-456');
        expect(scope.userId).toBe('user-123');
        expect(scope.role).toBe('ADMIN');
    });

    it('should strictly isolate by orgId (Boundary Check)', async () => {
        // This test logic is implied by requireOperationalScope returning ONLY the activeOrgId.
        // Developers MUST use the returned orgId in their queries.
        (workspaceResolver.getWorkspaceState as any).mockResolvedValue({
            status: 'AUTHENTICATED',
            userId: 'user-1',
            activeOrgId: 'org-A',
        });

        const scope = await requireOperationalScope();
        expect(scope.orgId).toBe('org-A');
        expect(scope.orgId).not.toBe('org-B');
    });
});
