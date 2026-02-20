'use server';

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function approveOrgAction(organizationId: string) {
    try {
        await prisma.organization.update({
            where: { id: organizationId },
            data: { status: 'ACTIVE' }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: 'SUPERADMIN_APPROVE_ORG',
                details: 'Organization approved and set to ACTIVE by superadmin'
            }
        });

        revalidatePath('/admin/orgs');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function extendTrialAction(organizationId: string, days: number = 14) {
    try {
        const sub = await prisma.subscription.findUnique({ where: { organizationId } });
        if (!sub) throw new Error("Subscription not found");

        const currentEnd = sub.trialEndsAt || new Date();
        const newEnd = new Date(currentEnd);
        newEnd.setDate(newEnd.getDate() + days);

        await prisma.subscription.update({
            where: { organizationId },
            data: {
                trialEndsAt: newEnd,
                status: 'TRIALING'
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: 'SUPERADMIN_EXTEND_TRIAL',
                details: `Extended trial by ${days} days until ${newEnd.toISOString()}`
            }
        });

        revalidatePath('/admin/orgs');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function grantCompAction(organizationId: string, days: number = 365) {
    try {
        const sub = await prisma.subscription.findUnique({ where: { organizationId } });
        if (!sub) throw new Error("Subscription not found");

        const newEnd = new Date();
        newEnd.setDate(newEnd.getDate() + days);

        await prisma.subscription.update({
            where: { organizationId },
            data: {
                status: 'ACTIVE',
                compedUntil: newEnd,
                compedReason: 'Superadmin Granted',
                source: 'COMPED'
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: 'SUPERADMIN_GRANT_COMP',
                details: `Granted COMP access for ${days} days`
            }
        });

        revalidatePath('/admin/orgs');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function pauseOrgAction(organizationId: string) {
    try {
        await prisma.subscription.update({
            where: { organizationId },
            data: {
                status: 'PAUSED'
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: 'SUPERADMIN_PAUSE_ORG',
                details: 'Organization paused by superadmin'
            }
        });

        revalidatePath('/admin/orgs');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function reactivateOrgAction(organizationId: string) {
    try {
        const sub = await prisma.subscription.findUnique({ where: { organizationId } });
        // If it was comped and comp is still valid, set to ACTIVE
        // Otherwise set to TRIALING to give them a chance to pay
        let newStatus = 'TRIALING';
        if (sub?.compedUntil && sub.compedUntil > new Date()) {
            newStatus = 'ACTIVE';
        }

        await prisma.subscription.update({
            where: { organizationId },
            data: {
                status: newStatus as any
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: 'SUPERADMIN_REACTIVATE_ORG',
                details: `Organization reactivated to ${newStatus}`
            }
        });

        revalidatePath('/admin/orgs');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
