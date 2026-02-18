export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'SUPERADMIN';

/**
 * Checks if a user has administrative privileges within their organization.
 */
export function isAdmin(role?: string | null): boolean {
    return role === 'OWNER' || role === 'ADMIN' || role === 'SUPERADMIN';
}

/**
 * Checks if a user is the primary owner of the organization.
 */
export function isOwner(role?: string | null): boolean {
    return role === 'OWNER' || role === 'SUPERADMIN';
}

/**
 * Checks if a user has global system management privileges (TechWise Admin).
 */
export function isSuperAdmin(role?: string | null): boolean {
    return role === 'SUPERADMIN';
}

/**
 * Checks if a user can manage organization settings and users.
 */
export function canManageOrganization(role?: string | null): boolean {
    return role === 'OWNER' || role === 'ADMIN' || role === 'SUPERADMIN';
}

/**
 * Checks if a user has read-only access.
 */
export function isViewer(role?: string | null): boolean {
    return role === 'VIEWER';
}

/**
 * Permission check for operational access (includes Viewer).
 */
export function canUseApp(role?: string | null): boolean {
    return !!role;
}

/**
 * Checks if a user has write access (excludes Viewer).
 */
export function canEdit(role?: string | null): boolean {
    return role === 'OWNER' || role === 'ADMIN' || role === 'SUPERADMIN' || role === 'MEMBER';
}
