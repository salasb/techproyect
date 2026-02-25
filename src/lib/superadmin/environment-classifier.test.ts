import { describe, it, expect } from 'vitest';
import { classifyOrganizationEnvironment } from './environment-classifier';

describe('environment-classifier', () => {
    it('classifies test organizations by name', () => {
        const org = { name: 'My Test Org', createdAt: new Date() };
        const result = classifyOrganizationEnvironment(org);
        expect(result.environmentClass).toBe('test');
        expect(result.isOperationallyRelevant).toBe(false);
    });

    it('classifies demo organizations by name', () => {
        const org = { name: 'Sales Demo Chile', createdAt: new Date() };
        const result = classifyOrganizationEnvironment(org);
        expect(result.environmentClass).toBe('demo');
        expect(result.isOperationallyRelevant).toBe(false);
    });

    it('classifies fresh trials as not operationally relevant', () => {
        const org = { 
            name: 'Acme Corp', 
            createdAt: new Date(), 
            subscription: { status: 'TRIALING' } 
        };
        const result = classifyOrganizationEnvironment(org);
        expect(result.environmentClass).toBe('trial');
        expect(result.isOperationallyRelevant).toBe(false); // Because it's fresh (< 48h)
    });

    it('classifies old trials as operationally relevant', () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const org = { 
            name: 'Acme Corp', 
            createdAt: threeDaysAgo, 
            subscription: { status: 'TRIALING' } 
        };
        const result = classifyOrganizationEnvironment(org);
        expect(result.environmentClass).toBe('trial');
        expect(result.isOperationallyRelevant).toBe(true);
    });

    it('classifies paid organizations as production', () => {
        const org = { 
            name: 'Big Client', 
            createdAt: new Date(), 
            plan: 'PRO' 
        };
        const result = classifyOrganizationEnvironment(org);
        expect(result.environmentClass).toBe('production');
        expect(result.isOperationallyRelevant).toBe(true);
    });
});
