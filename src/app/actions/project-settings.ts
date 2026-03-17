'use server'

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AuditService } from "@/services/auditService";

export async function updateProjectSettings(
    projectId: string,
    data: any,
    conversion?: { convertValues: boolean, conversionFactor: number }
) {
    const traceId = `PRJ-SET-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        let userName = 'Sistema';
        if (user) {
            userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Usuario';
        }

        console.log(`[Projects][${traceId}] Updating settings for project=${projectId}, user=${userName}`);

        // Sanitize data for Prisma (remove non-db fields if any)
        const { id, organizationId, createdAt, ...cleanData } = data;
        
        const updatePayload = {
            ...cleanData,
            updatedAt: new Date(),
            responsible: userName
        };

        // We use a transaction if conversion is needed
        await prisma.$transaction(async (tx) => {
            // 1. Update Project
            await tx.project.update({
                where: { id: projectId },
                data: updatePayload
            });

            // 2. Handle currency conversion if requested
            if (conversion?.convertValues && conversion.conversionFactor && conversion.conversionFactor !== 1) {
                const factor = conversion.conversionFactor;
                console.log(`[Projects][${traceId}] Applying conversion factor: ${factor}`);

                // A. Update Costs
                await tx.costEntry.updateMany({
                    where: { projectId },
                    data: { amountNet: { multiply: factor } }
                });

                // B. Update Quote Items (Manual updateMany doesn't support multiply easily in all Prisma versions, we iterate if necessary or use executeRaw)
                // For safety and compatibility, we'll do direct updates
                const items = await tx.quoteItem.findMany({ where: { projectId }, select: { id: true, priceNet: true, costNet: true } });
                for (const item of items) {
                    await tx.quoteItem.update({
                        where: { id: item.id },
                        data: {
                            priceNet: item.priceNet * factor,
                            costNet: (item.costNet || 0) * factor
                        }
                    });
                }

                // C. Update Invoices
                const invoices = await tx.invoice.findMany({ where: { projectId }, select: { id: true, amountInvoicedGross: true, amountPaidGross: true } });
                for (const inv of invoices) {
                    await tx.invoice.update({
                        where: { id: inv.id },
                        data: {
                            amountInvoicedGross: inv.amountInvoicedGross * factor,
                            amountPaidGross: inv.amountPaidGross * factor
                        }
                    });
                }
            }
        });

        // Audit Log
        const changedFields = Object.keys(cleanData).join(', ');
        await AuditService.logAction(projectId, 'UPDATE_SETTINGS', `Campos actualizados: ${changedFields}. Por: ${userName}`);

        console.log(`[Projects][${traceId}] Update successful`);

        revalidatePath(`/projects/${projectId}`);
        revalidatePath(`/projects/${projectId}/quote`);
        revalidatePath('/projects');
        
        return { success: true };

    } catch (error: any) {
        console.error(`[Projects][${traceId}] Critical error in updateProjectSettings:`, error.message);
        return { success: false, error: "Error al actualizar la configuración del proyecto.", traceId };
    }
}
