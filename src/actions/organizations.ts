'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireOperationalScope } from "@/lib/auth/server-resolver";
import { isAdmin } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { AuditService } from "@/services/auditService";

/**
 * Updates organization settings with audit logging.
 */
export async function updateOrganizationAction(formData: FormData) {
    const scope = await requireOperationalScope();
    const orgId = scope.orgId;

    if (!isAdmin(scope.role)) {
        throw new Error("Acceso denegado: Se requiere rol de Administrador");
    }

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
