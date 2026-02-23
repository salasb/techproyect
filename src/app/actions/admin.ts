'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { normalizeOperationalError } from "@/lib/superadmin/error-normalizer";
import { resolveSuperadminAccess } from "@/lib/auth/superadmin-guard";

/**
 * Updates the activation status of an organization.
 */
export async function updateOrganizationStatus(orgId: string, status: 'PENDING' | 'ACTIVE' | 'INACTIVE') {
    try {
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { success: false, error: "No autorizado para esta acción maestra." };

        const supabase = await createClient();
        const { error } = await supabase
            .from('Organization')
            .update({ status, updatedAt: new Date().toISOString() })
            .eq('id', orgId);

        if (error) throw error;

        // Add traceability log
        await prisma.auditLog.create({
            data: {
                organizationId: orgId,
                action: status === 'ACTIVE' ? 'SUPERADMIN_APPROVE_ORG' : `SUPERADMIN_SET_ORG_${status}`,
                details: `Organization status explicitly set to ${status} by ${access.email}`,
                userName: access.email
            }
        });

        revalidatePath('/admin/orgs');
        return { success: true };
    } catch (err: unknown) {
        const normalized = normalizeOperationalError(err);
        return { success: false, error: normalized.message };
    }
}

/**
 * Updates the subscription plan of an organization.
 */
export async function updateOrganizationPlan(orgId: string, plan: 'FREE' | 'PRO' | 'ENTERPRISE') {
    try {
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { success: false, error: "Permisos insuficientes para modificar planes." };

        const supabase = await createClient();
        const { error } = await supabase
            .from('Organization')
            .update({ plan, updatedAt: new Date().toISOString() })
            .eq('id', orgId);

        if (error) throw error;

        revalidatePath('/admin/orgs');
        return { success: true };
    } catch (err: unknown) {
        const normalized = normalizeOperationalError(err);
        return { success: false, error: normalized.message };
    }
}

/**
 * Updates a user's role globally.
 */
export async function updateUserRole(userId: string, role: string) {
    try {
        const access = await resolveSuperadminAccess();
        if (!access.ok) return { success: false, error: "Solo superadmins pueden modificar roles globales." };

        const supabase = await createClient();
        const { error } = await supabase
            .from('Profile')
            .update({ role, updatedAt: new Date().toISOString() })
            .eq('id', userId);

        if (error) throw error;

        revalidatePath('/admin/users');
        return { success: true };
    } catch (err: unknown) {
        const normalized = normalizeOperationalError(err);
        return { success: false, error: normalized.message };
    }
}
