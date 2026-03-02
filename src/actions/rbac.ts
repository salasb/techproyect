'use server'

import { requireOperationalScope } from "@/lib/auth/server-resolver";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Permission, getRolePermissions } from "@/lib/auth/rbac";

export async function getCustomRolesAction() {
    const scope = await requireOperationalScope();
    return prisma.customRole.findMany({
        where: { organizationId: scope.orgId },
        include: { _count: { select: { members: true, invitations: true } } },
        orderBy: { createdAt: 'desc' }
    });
}

export async function createCustomRoleAction(formData: FormData) {
    const scope = await requireOperationalScope();
    // Only OWNERs or ADMINs with specific rights should manage RBAC.
    // For now, let's enforce OWNER or ADMIN (with TEAM_MANAGE).
    if (scope.role !== 'OWNER' && !scope.permissions.includes('TEAM_MANAGE')) {
        throw new Error("No autorizado para crear roles.");
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const permissions = formData.getAll("permissions") as string[];

    if (!name) throw new Error("El nombre del rol es requerido.");

    const role = await prisma.customRole.create({
        data: {
            organizationId: scope.orgId,
            name,
            description,
            permissions
        }
    });

    await prisma.auditLog.create({
        data: {
            organizationId: scope.orgId,
            userId: scope.userId,
            action: 'CUSTOM_ROLE_CREATED',
            details: `Created custom role: ${name} with permissions: ${permissions.join(', ')}`
        }
    });

    revalidatePath("/settings/organization/roles");
    return { success: true, roleId: role.id };
}

export async function updateCustomRoleAction(roleId: string, formData: FormData) {
    const scope = await requireOperationalScope();
    if (scope.role !== 'OWNER' && !scope.permissions.includes('TEAM_MANAGE')) {
        throw new Error("No autorizado para editar roles.");
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const permissions = formData.getAll("permissions") as string[];

    if (!name) throw new Error("El nombre del rol es requerido.");

    const role = await prisma.customRole.update({
        where: { id: roleId, organizationId: scope.orgId },
        data: {
            name,
            description,
            permissions
        }
    });

    await prisma.auditLog.create({
        data: {
            organizationId: scope.orgId,
            userId: scope.userId,
            action: 'CUSTOM_ROLE_UPDATED',
            details: `Updated custom role: ${name} with permissions: ${permissions.join(', ')}`
        }
    });

    revalidatePath("/settings/organization/roles");
    return { success: true };
}

export async function deleteCustomRoleAction(roleId: string) {
    const scope = await requireOperationalScope();
    if (scope.role !== 'OWNER' && !scope.permissions.includes('TEAM_MANAGE')) {
        throw new Error("No autorizado para eliminar roles.");
    }

    // Unassign role from members/invitations (Fallback to MEMBER)
    await prisma.$transaction([
        prisma.organizationMember.updateMany({
            where: { customRoleId: roleId, organizationId: scope.orgId },
            data: { customRoleId: null, role: 'MEMBER' }
        }),
        prisma.userInvitation.updateMany({
            where: { customRoleId: roleId, organizationId: scope.orgId },
            data: { customRoleId: null, role: 'MEMBER' }
        }),
        prisma.customRole.delete({
            where: { id: roleId, organizationId: scope.orgId }
        })
    ]);

    await prisma.auditLog.create({
        data: {
            organizationId: scope.orgId,
            userId: scope.userId,
            action: 'CUSTOM_ROLE_DELETED',
            details: `Deleted custom role: ${roleId}`
        }
    });

    revalidatePath("/settings/organization/roles");
    return { success: true };
}
