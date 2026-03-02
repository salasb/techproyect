'use server';

import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ActivationService } from "@/services/activation-service";
import { requireOperationalScope, requirePermission } from "@/lib/auth/server-resolver";
import { isAdmin } from "@/lib/permissions";
import { AuditService } from "@/services/auditService";
import { revalidatePath } from "next/cache";

/**
 * Updates organization settings with audit logging.
 */
export async function updateOrganizationAction(formData: FormData) {
    const scope = await requirePermission('ORG_MANAGE');
    const orgId = scope.orgId;

    const name = formData.get("name") as string;
    const rut = formData.get("rut") as string;
    const logoUrl = formData.get("logoUrl") as string;

    const oldOrg = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, rut: true, logoUrl: true }
    });

    await prisma.organization.update({
        where: { id: orgId },
        data: {
            name,
            rut,
            logoUrl,
            updatedAt: new Date()
        }
    });

    // Audit change
    let changeDetails = [];
    if (oldOrg?.name !== name) changeDetails.push(`Nombre: ${oldOrg?.name} -> ${name}`);
    if (oldOrg?.rut !== rut) changeDetails.push(`RUT: ${oldOrg?.rut} -> ${rut}`);
    if (oldOrg?.logoUrl !== logoUrl) changeDetails.push(`Logo cambiado`);

    if (changeDetails.length > 0) {
        await AuditService.logAction(
            null,
            'ORG_SETTINGS_CHANGED',
            `Cambios realizados: ${changeDetails.join(', ')}`
        );
    }

    revalidatePath('/settings/organization');
    revalidatePath('/settings');
    
    return { success: true };
}

/**
 * Creates a new organization with initial subscription and owner membership.
 */
export async function createOrganizationAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const name = formData.get('name') as string;
    const mode = (formData.get('mode') as any) || 'SOLO';
    const country = 'CL';
    const vatRate = 0.19;

    const requireManualApproval = process.env.MANUAL_APPROVAL_REQUIRED === '1';

    // 0. Ensure Profile exists
    let profile = await prisma.profile.findUnique({ where: { id: user.id } });
    if (!profile) {
        try {
            profile = await prisma.profile.create({
                data: {
                    id: user.id,
                    email: user.email!,
                    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
                    role: 'MEMBER'
                }
            });
        } catch (e) {
            throw new Error("No se pudo inicializar tu perfil de usuario para crear la organización.");
        }
    }

    try {
        const org = await prisma.$transaction(async (tx) => {
            // 1. Create Organization
            const newOrg = await tx.organization.create({
                data: {
                    name,
                    mode,
                    status: requireManualApproval ? 'PENDING' : 'ACTIVE',
                    plan: 'FREE',
                    settings: {
                        country,
                        vatRate,
                        isSoloMode: mode === 'SOLO'
                    }
                }
            });

            // 2. Create Membership (Owner)
            await tx.organizationMember.create({
                data: {
                    organizationId: newOrg.id,
                    userId: user.id,
                    role: 'OWNER',
                    status: 'ACTIVE'
                }
            });

            // 3. Create Subscription (Trial 14 days)
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 14);

            await tx.subscription.create({
                data: {
                    organizationId: newOrg.id,
                    status: 'TRIALING',
                    planCode: 'PRO_TRIAL',
                    trialEndsAt,
                    seatLimit: mode === 'SOLO' ? 1 : 5
                }
            });

            // 4. Initialize Stats
            await tx.organizationStats.create({
                data: {
                    organizationId: newOrg.id,
                    healthScore: 100
                }
            });

            return newOrg;
        });

        // 5. Activation Milestone
        try {
            await ActivationService.trackFunnelEvent('ORG_CREATED', org.id, `org_created_${org.id}`, user.id);
            await ActivationService.trackFunnelEvent('ADMIN_ASSIGNED', org.id, `admin_assigned_${org.id}_${user.id}`, user.id);
            await ActivationService.trackFirst('ORG_CREATED', org.id, user.id);
        } catch (e) {}

        const cookieStore = await cookies();
        cookieStore.set('app-org-id', org.id);

        redirect('/dashboard');
    } catch (error: any) {
        if (error.message === 'NEXT_REDIRECT') throw error;
        throw new Error("Error crítico al crear la organización.");
    }
}

/**
 * Switches current organization context
 */
export async function switchOrganizationAction(organizationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Verify membership
    const membership = await prisma.organizationMember.findFirst({
        where: {
            organizationId,
            userId: user.id,
            status: 'ACTIVE'
        }
    });

    if (!membership) throw new Error("No access to this organization");

    // Audit the switch
    await AuditService.logAction(
        null,
        'ORG_SWITCH',
        `Usuario cambió a organización: ${organizationId}`
    );

    // Update Profile
    await prisma.profile.update({
        where: { id: user.id },
        data: { organizationId: organizationId }
    });

    const cookieStore = await cookies();
    cookieStore.set('app-org-id', organizationId);

    redirect('/dashboard');
}

/**
 * Gets organizations for the current user
 */
export async function getUserOrganizations() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    return prisma.organization.findMany({
        where: {
            OR: [
                {
                    OrganizationMember: {
                        some: {
                            userId: user.id,
                            status: 'ACTIVE'
                        }
                    }
                },
                {
                    profiles: {
                        some: {
                            id: user.id
                        }
                    }
                }
            ]
        },
        include: {
            subscription: true,
        }
    });
}
