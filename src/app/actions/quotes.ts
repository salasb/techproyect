'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { AuditService } from "@/services/auditService";
import { getOrganizationId } from "@/lib/current-org";

export async function toggleQuoteAcceptance(projectId: string, isAccepted: boolean) {
    const orgId = await getOrganizationId();
    const supabase = await createClient();
    const acceptedAt = isAccepted ? new Date().toISOString() : null;

    const { error } = await supabase
        .from('Project')
        .update({ acceptedAt } as any)
        .eq('id', projectId);

    if (error) {
        console.error("Error toggling quote acceptance:", error);
        throw new Error("Failed to update quote acceptance status");
    }

    // Log the action in ProjectLog
    const logContent = isAccepted
        ? "Cotización Aceptada Digitalmente (Timbre Generado)"
        : "Aceptación Digital Revocada";

    const { error: logError } = await supabase
        .from('ProjectLog')
        .insert({
            projectId,
            organizationId: orgId,
            content: logContent,
            type: 'MILESTONE'
        });

    if (logError) {
        console.error("Error logging quote acceptance:", logError);
        // We don't throw here to avoid failing the UI toggle if just the log fails
    }

    // Add entry to AuditLog (System Audit)
    await AuditService.logAction(projectId, 'QUOTE_ACCEPTANCE_TOGGLE', logContent);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/quote`);
    return { success: true };
}
