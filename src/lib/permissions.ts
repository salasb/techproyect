export type UserRole = 'ADMIN' | 'USER' | 'SUPERADMIN' | 'VIEWER';

/**
 * Checks if a user has administrative privileges within their organization.
 */
export function isAdmin(role?: string | null): boolean {
    return role === 'ADMIN' || role === 'SUPERADMIN';
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
    return isAdmin(role);
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
    return role === 'ADMIN' || role === 'SUPERADMIN' || role === 'USER';
}
