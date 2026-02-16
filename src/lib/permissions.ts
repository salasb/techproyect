export type UserRole = 'ADMIN' | 'USER' | 'SUPERADMIN';

/**
 * Checks if a user has administrative privileges within their organization.
 */
export function isAdmin(role?: string | null): boolean {
    return role === 'ADMIN' || role === 'SUPERADMIN';
}

/**
 * Checks if a user has global system management privileges (Geocom).
 */
export function isSuperAdmin(role?: string | null): boolean {
    return role === 'SUPERADMIN';
}

/**
 * Checks if a user can manage organization settings and users.
 */
export function canManageOrganization(role?: string | null): boolean {
    return isAdmin(role);
}

/**
 * Permission check for operational access.
 */
export function canUseApp(role?: string | null): boolean {
    return !!role;
}
