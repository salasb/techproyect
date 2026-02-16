'use server'

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/current-org";
import { AuditService } from "@/services/auditService";

/**
 * Creates an invoice based on the accepted quote of a project.
 */
export async function createInvoiceFromProject(projectId: string) {
    const orgId = await getOrganizationId();
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
    // Filter selected items only if logic requires, usually accepted quote includes all active items
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
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`; // Simple logic

    const { error } = await supabase.from('Invoice').insert({
        id: invoiceId,
        projectId: projectId,
        organizationId: orgId,
        amountInvoicedGross: totalGross,
        amountPaidGross: 0,
        sent: false,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days default
        updatedAt: new Date().toISOString()
    });

    if (error) throw new Error(`Error creando factura: ${error.message}`);

    // 5. Log Action
    await AuditService.logAction(projectId, 'INVOICE_CREATE', `Factura ${invoiceNumber} generada automáticamente desde cotización por $${totalGross.toLocaleString()}`);

    // 6. Update Project Next Action if needed
    await supabase.from('Project').update({
        nextAction: 'Enviar Factura',
        nextActionDate: new Date().toISOString()
    }).eq('id', projectId);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/dashboard`);
    return { success: true, invoiceId };
}
