import { MembershipRole } from "@prisma/client";

export type Permission = 
    | 'BILLING_MANAGE' 
    | 'FINANCE_VIEW' 
    | 'QUOTES_MANAGE' 
    | 'PROJECTS_MANAGE' 
    | 'TEAM_MANAGE' 
    | 'SUPPORT_MANAGE'
    | 'INVENTORY_MANAGE'
    | 'CRM_MANAGE'
    | 'INTEGRATIONS_MANAGE'
    | 'ORG_MANAGE';

const ROLE_PERMISSIONS: Record<MembershipRole, Permission[]> = {
    OWNER: [
        'BILLING_MANAGE', 'FINANCE_VIEW', 'QUOTES_MANAGE', 
        'PROJECTS_MANAGE', 'TEAM_MANAGE', 'SUPPORT_MANAGE',
        'INVENTORY_MANAGE', 'CRM_MANAGE', 'INTEGRATIONS_MANAGE',
        'ORG_MANAGE'
    ],
    ADMIN: [
        'FINANCE_VIEW', 'QUOTES_MANAGE', 'PROJECTS_MANAGE', 
        'TEAM_MANAGE', 'SUPPORT_MANAGE', 'INVENTORY_MANAGE', 
        'CRM_MANAGE', 'ORG_MANAGE'
    ],
    MEMBER: [
        'QUOTES_MANAGE', 'PROJECTS_MANAGE', 'SUPPORT_MANAGE',
        'CRM_MANAGE'
    ],
    VIEWER: [
        'FINANCE_VIEW'
    ],
    SUPERADMIN: [
        // Superadmins usually bypass checks, but we include all for consistency
        'BILLING_MANAGE', 'FINANCE_VIEW', 'QUOTES_MANAGE', 
        'PROJECTS_MANAGE', 'TEAM_MANAGE', 'SUPPORT_MANAGE',
        'INVENTORY_MANAGE', 'CRM_MANAGE'
    ]
};

/**
 * Checks if a role has a specific permission.
 */
export function hasPermission(role: MembershipRole | string | null, permission: Permission): boolean {
    if (!role) return false;
    
    // Superadmin bypass (Internal TechWise Ops)
    if (role === 'SUPERADMIN') return true;

    const permissions = ROLE_PERMISSIONS[role as MembershipRole];
    return permissions?.includes(permission) || false;
}

/**
 * Returns all permissions for a given role.
 */
export function getRolePermissions(role: MembershipRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
}
