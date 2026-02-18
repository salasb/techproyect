'use server'

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/current-org";
import { AuditService } from "@/services/auditService";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import { ActivationService } from "@/services/activation-service";

/**
 * Creates an invoice based on the accepted quote of a project.
 */
export async function createInvoiceFromProject(projectId: string) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
    const supabase = await createClient();

    // 1. Fetch Project and Quote Items to calculate total
    const { data: project } = await supabase
        .from('Project')
        .select(`
            *,
            quoteItems:QuoteItem(*)
        `)
        .eq('id', projectId)
        .single();

    if (!project) throw new Error("Proyecto no encontrado");

    // 2. Validate Status
    if (project.status === 'EN_ESPERA' || project.stage === 'LEVANTAMIENTO') {
        throw new Error("El proyecto debe estar En Curso/Aceptado para facturar.");
    }

    // 3. Calculate Totals
    const selectedItems = project.quoteItems?.filter((i: any) => i.isSelected !== false) || [];

    if (selectedItems.length === 0) {
        throw new Error("No hay ítems en la cotización para facturar.");
    }

    // Calculate Net
    const totalNet = selectedItems.reduce((acc: number, item: any) => acc + (item.priceNet * item.quantity), 0);

    // Get Settings for VAT
    const { data: settings } = await supabase.from('Settings').select('vatRate').single();
    const vatRate = settings?.vatRate || 0.19;

    // Calculate Gross
    const totalGross = totalNet * (1 + vatRate);

    // 4. Create Invoice
    const invoiceId = crypto.randomUUID();
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    const { error } = await supabase.from('Invoice').insert({
        id: invoiceId,
        projectId: projectId,
        organizationId: orgId,
        amountInvoicedGross: totalGross,
        amountPaidGross: 0,
        sent: false,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
    });

    if (error) throw new Error(`Error creando factura: ${error.message}`);

    // 5. Log Action & Milestone
    await AuditService.logAction(projectId, 'INVOICE_CREATE', `Factura ${invoiceNumber} generada automáticamente desde cotización por $${totalGross.toLocaleString()}`);
    await ActivationService.trackMilestone(orgId, 'FIRST_INVOICE_CREATED');

    // 6. Update Project Next Action if needed
    await supabase.from('Project').update({
        nextAction: 'Enviar Factura',
        nextActionDate: new Date().toISOString()
    }).eq('id', projectId);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/dashboard`);
    return { success: true, invoiceId };
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
    await ActivationService.trackMilestone(orgId, 'FIRST_INVOICE_CREATED');

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

    // Fetch current invoice to check existing payments if needed, keeping simple assumes full payment or increment
    // Since UI sends "currentAmount", simplified logic handles it as "Fully Paid Trigger" if amount matches total?
    // The UI sends `inv.amountInvoicedGross` as `amount` when clicking "Pagada" (full payment).

    const { error } = await supabase.from('Invoice').update({
        amountPaidGross: amount,
        paidDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }).eq('id', invoiceId);

    if (error) throw new Error(`Error registrando pago: ${error.message}`);

    await AuditService.logAction(projectId, 'INVOICE_PAYMENT', `Pago registrado por $${amount.toLocaleString()}`);

    // Check if Project is Fully Paid logic could go here or be handled by logic inside component calling closeProject
    // Return status
    return { success: true, isFullyPaid: true };
}
