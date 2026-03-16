import { resolveAccessContext } from './auth/access-resolver';

/**
 * Robustly gets the current organization ID with DB fallback.
 * Uses the canonical resolveAccessContext.
 */
export async function getOrganizationId() {
    try {
        const context = await resolveAccessContext();
        return context.activeOrgId || '';
    } catch (e) {
        return '';
    }
}
