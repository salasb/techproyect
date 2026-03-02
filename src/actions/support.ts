'use server'

import { requireOperationalScope, requirePermission } from "@/lib/auth/server-resolver";
import { SupportService } from "@/services/support-service";
import { TicketStatus, TicketPriority } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createTicketAction(formData: FormData) {
    const scope = await requirePermission('SUPPORT_MANAGE');
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const priority = (formData.get("priority") as TicketPriority) || TicketPriority.P2;

    if (!title || !description) throw new Error("Título y descripción son requeridos");

    const ticket = await SupportService.createTicket({
        organizationId: scope.orgId,
        userId: scope.userId,
        title,
        description,
        priority
    });

    revalidatePath("/settings/support");
    return { success: true, ticketId: ticket.id };
}

export async function addTicketMessageAction(ticketId: string, content: string) {
    const scope = await requirePermission('SUPPORT_MANAGE');
    
    if (!content) throw new Error("El mensaje no puede estar vacío");

    // Check if user has access to this ticket
    const ticket = await SupportService.getTicketDetails(ticketId);
    if (!ticket) throw new Error("Ticket no encontrado");

    const isAdminReply = scope.isSuperadmin || scope.role === 'OWNER' || scope.role === 'ADMIN';
    
    // Safety check for non-superadmins: must be same org
    if (!scope.isSuperadmin && ticket.organizationId !== scope.orgId) {
        throw new Error("No tienes permiso para responder a este ticket");
    }

    await SupportService.addMessage({
        ticketId,
        userId: scope.userId,
        content,
        isAdminReply: scope.isSuperadmin // Only mark as admin reply if it comes from superadmin context? 
        // Or if it's an admin of the org? Usually Support is for system-wide support.
        // Let's assume for v1.0 that "AdminReply" means Superadmin or "Official Support".
    });

    revalidatePath(`/settings/support/${ticketId}`);
    revalidatePath(`/admin/support/${ticketId}`);
    return { success: true };
}

export async function resolveTicketAction(ticketId: string) {
    const scope = await requirePermission('SUPPORT_MANAGE');
    
    const ticket = await SupportService.getTicketDetails(ticketId);
    if (!ticket) throw new Error("Ticket no encontrado");

    // Only creator or admin can resolve
    if (!scope.isSuperadmin && ticket.organizationId !== scope.orgId) {
        throw new Error("No tienes permiso para modificar este ticket");
    }

    await SupportService.updateStatus(ticketId, TicketStatus.RESOLVED, scope.userId);

    revalidatePath(`/settings/support/${ticketId}`);
    revalidatePath(`/admin/support/${ticketId}`);
    return { success: true };
}

export async function updateTicketStatusAction(ticketId: string, status: TicketStatus) {
    const scope = await requireOperationalScope();
    
    // Only superadmins can manually change status to anything (e.g. IN_PROGRESS)
    if (!scope.isSuperadmin) throw new Error("Acceso denegado");

    await SupportService.updateStatus(ticketId, status, scope.userId);

    revalidatePath(`/admin/support/${ticketId}`);
    revalidatePath(`/settings/support/${ticketId}`);
    return { success: true };
}
