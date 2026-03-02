import { describe, it, expect } from 'vitest';
import { hasPermission, getRolePermissions, Permission } from './rbac';
import { MembershipRole } from '@prisma/client';

describe('RBAC Logic (v1.2)', () => {
    it('should grant all permissions to SUPERADMIN', () => {
        expect(hasPermission('SUPERADMIN', 'BILLING_MANAGE')).toBe(true);
        expect(hasPermission('SUPERADMIN', 'FINANCE_VIEW')).toBe(true);
        expect(hasPermission('SUPERADMIN', 'INVENTORY_MANAGE')).toBe(true);
    });

    it('should grant specific permissions to OWNER', () => {
        expect(hasPermission('OWNER', 'BILLING_MANAGE')).toBe(true);
        expect(hasPermission('OWNER', 'TEAM_MANAGE')).toBe(true);
        expect(hasPermission('OWNER', 'CRM_MANAGE')).toBe(true);
    });

    it('should deny sensitive permissions to MEMBER', () => {
        expect(hasPermission('MEMBER', 'BILLING_MANAGE')).toBe(false);
        expect(hasPermission('MEMBER', 'TEAM_MANAGE')).toBe(false);
        expect(hasPermission('MEMBER', 'INTEGRATIONS_MANAGE')).toBe(false);
    });

    it('should allow operational permissions to MEMBER', () => {
        expect(hasPermission('MEMBER', 'QUOTES_MANAGE')).toBe(true);
        expect(hasPermission('MEMBER', 'PROJECTS_MANAGE')).toBe(true);
    });

    it('should correctly handle null or invalid roles', () => {
        expect(hasPermission(null, 'FINANCE_VIEW')).toBe(false);
        expect(hasPermission('INVALID_ROLE', 'FINANCE_VIEW')).toBe(false);
    });

    it('should return correct permission sets for roles', () => {
        const ownerPerms = getRolePermissions('OWNER');
        expect(ownerPerms).toContain('BILLING_MANAGE');
        expect(ownerPerms).toContain('ORG_MANAGE');

        const viewerPerms = getRolePermissions('VIEWER');
        expect(viewerPerms).toEqual(['FINANCE_VIEW']);
    });
});
