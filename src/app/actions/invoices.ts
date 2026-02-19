'use server'

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/current-org";
import { AuditService } from "@/services/auditService";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import { ActivationService } from "@/services/activation-service";
import { InvoiceService } from "@/services/invoiceService";
import prisma from "@/lib/prisma";

/**
 * Creates an invoice based on the accepted quote of a project.
 */
export async function createInvoiceFromProject(projectId: string) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'SYSTEM';

    // 1. Find Accepted Quote
    const acceptedQuote = await prisma.quote.findFirst({
        where: { projectId, status: 'ACCEPTED' },
        orderBy: { version: 'desc' }
    });

    if (!acceptedQuote) {
        throw new Error("No hay una cotización aceptada para facturar.");
    }

    // 2. Generate Invoice via Service
    const invoice = await InvoiceService.generateFromQuote(acceptedQuote.id, userId, orgId);

    // 3. Update Project Next Action if needed
    await prisma.project.update({
        where: { id: projectId },
        data: {
            nextAction: 'Enviar Factura',
            nextActionDate: new Date()
        }
    });

    // Milestone
    await ActivationService.trackFirst('FIRST_INVOICE_CREATED', orgId);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/dashboard`);
    return { success: true, invoiceId: invoice.id };
}

/**
 * Creates a manual invoice with a specific amount.
 */
export async function createInvoice(projectId: string, formData: FormData) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
    const supabase = await createClient();

    const amount = parseFloat(formData.get('amount') as string);
    const dueDate = formData.get('dueDate') as string;

    if (!amount || amount <= 0) throw new Error("Monto inválido");
    if (!dueDate) throw new Error("Fecha de vencimiento requerida");

    const invoiceId = crypto.randomUUID();

    const { error } = await supabase.from('Invoice').insert({
        id: invoiceId,
        projectId: projectId,
        organizationId: orgId,
        amountInvoicedGross: amount,
        amountPaidGross: 0,
        sent: false,
        dueDate: new Date(dueDate).toISOString(),
        updatedAt: new Date().toISOString()
    });

    if (error) throw new Error(`Error creando factura: ${error.message}`);

    await AuditService.logAction(projectId, 'INVOICE_CREATE', `Factura manual creada por $${amount.toLocaleString()}`);
    await ActivationService.trackFirst('FIRST_INVOICE_CREATED', orgId);

    revalidatePath(`/projects/${projectId}`);
    return { success: true, invoiceId };
}

export async function deleteInvoice(projectId: string, invoiceId: string) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
    const supabase = await createClient();

    const { error } = await supabase.from('Invoice').delete().eq('id', invoiceId);
    if (error) throw new Error(`Error eliminando factura: ${error.message}`);

    await AuditService.logAction(projectId, 'INVOICE_DELETE', `Factura eliminada`);
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

export async function markInvoiceSent(projectId: string, invoiceId: string, sentDate: string) {
    const supabase = await createClient();

    const { error } = await supabase.from('Invoice').update({
        sent: true,
        sentDate: new Date(sentDate).toISOString(),
        updatedAt: new Date().toISOString()
    }).eq('id', invoiceId);

    if (error) throw new Error(`Error actualizando factura: ${error.message}`);

    await AuditService.logAction(projectId, 'INVOICE_UPDATE', `Factura marcada como enviada`);

    // Update Project Next Action
    await supabase.from('Project').update({
        nextAction: 'Seguimiento Pago',
        nextActionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Check in 7 days
    }).eq('id', projectId);

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}


export async function registerPayment(projectId: string, invoiceId: string, amount: number) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'SYSTEM';

    // Call Service
    // method is hardcoded 'MANUAL' or passed? Existing fn signature only has amount.
    // 'reference' is null.
    await InvoiceService.registerPayment(invoiceId, amount, 'MANUAL', null, userId, orgId);

    // Check if Project is Fully Paid logic could go here or be handled by logic inside component calling closeProject
    return { success: true, isFullyPaid: true };
}
