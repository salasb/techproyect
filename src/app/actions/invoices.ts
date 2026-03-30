'use server'
import { generateId } from "@/lib/id";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOperationalScope, requirePermission } from "@/lib/auth/server-resolver";
import { AuditService } from "@/services/auditService";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import { ActivationService } from "@/services/activation-service";
import { InvoiceService } from "@/services/invoiceService";
import prisma from "@/lib/prisma";

/**
 * Creates an invoice based on the accepted quote of a project.
 */
export async function createInvoiceFromProject(projectId: string) {
    const scope = await requirePermission('FINANCE_VIEW');
    await ensureNotPaused(scope.orgId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'SYSTEM';

    // 1. Find Accepted Quote
    const acceptedQuote = await prisma.quote.findFirst({
        where: { projectId, status: 'ACCEPTED', project: { organizationId: scope.orgId } },
        orderBy: { version: 'desc' }
    });

    if (!acceptedQuote) {
        throw new Error("No hay una cotización aceptada para facturar.");
    }

    // 2. Generate Invoice via Service
    const invoice = await InvoiceService.generateFromQuote(acceptedQuote.id, userId, scope.orgId);

    // 3. Update Project Next Action if needed
    await prisma.project.update({
        where: { id: projectId, organizationId: scope.orgId },
        data: {
            nextAction: 'Enviar Factura',
            nextActionDate: new Date()
        }
    });

    // Milestone
    await ActivationService.trackFirst('FIRST_INVOICE_CREATED', scope.orgId);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/dashboard`);
    return { success: true, invoiceId: invoice.id };
}

/**
 * Creates a manual invoice with a specific amount.
 */
export async function createInvoice(projectId: string, formData: FormData) {
    const scope = await requirePermission('FINANCE_VIEW');
    await ensureNotPaused(scope.orgId);
    const supabase = await createClient();

    const amount = parseFloat(formData.get('amount') as string);
    const dueDate = formData.get('dueDate') as string;

    if (!amount || amount <= 0) throw new Error("Monto inválido");
    if (!dueDate) throw new Error("Fecha de vencimiento requerida");

    const invoiceId = generateId();

    const { error } = await supabase.from('Invoice').insert({
        id: invoiceId,
        projectId: projectId,
        organizationId: scope.orgId,
        amountInvoicedGross: amount,
        amountPaidGross: 0,
        sent: false,
        dueDate: new Date(dueDate).toISOString(),
        updatedAt: new Date().toISOString()
    });

    if (error) throw new Error(`Error creando factura: ${error.message}`);

    await AuditService.logAction({
        projectId: projectId,
        action: 'INVOICE_CREATE',
        details: `Factura manual creada por $${amount.toLocaleString('es-CL')}`
    });
    await ActivationService.trackFirst('FIRST_INVOICE_CREATED', scope.orgId);

    revalidatePath(`/projects/${projectId}`);
    return { success: true, invoiceId };
}

export async function deleteInvoice(projectId: string, invoiceId: string) {
    const traceId = Math.random().toString(36).substring(7).toUpperCase();
    try {
        const scope = await requirePermission('PROJECTS_MANAGE');
        await ensureNotPaused(scope.orgId);

        // 1. Fetch invoice to check status (Domain Rule)
        // Using prisma to avoid RLS silent failures in server actions
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            select: { status: true, amountInvoicedGross: true, organizationId: true }
        });

        if (!invoice || invoice.organizationId !== scope.orgId) {
            return { success: false, error: "INVOICE_NOT_FOUND", message: "La factura no existe o no tienes acceso." };
        }

        // 2. Domain Contract: Only DRAFT invoices can be hard-deleted
        if (invoice.status !== 'DRAFT') {
            return { 
                success: false, 
                error: "INVOICE_DELETE_FORBIDDEN", 
                message: `No se puede eliminar una factura en estado ${invoice.status}. Considere anularla (VOID).` 
            };
        }

        // 3. Atomic Execution via Prisma
        await prisma.invoice.delete({
            where: { id: invoiceId }
        });

        console.log(`[Invoices][${traceId}] Invoice ${invoiceId} deleted successfully by ${scope.orgId}`);

        // 4. Audit
        await AuditService.logAction({
            projectId: projectId, 
            action: 'INVOICE_DELETE', 
            details: `Factura DRAFT eliminada por $${invoice.amountInvoicedGross.toLocaleString('es-CL')}`
        });

        // 5. Hard Revalidation
        revalidatePath(`/projects/${projectId}`);
        revalidatePath(`/dashboard`);
        
        return { success: true };

    } catch (error: any) {
        console.error(`[Invoices][${traceId}] Exception:`, error.message);
        return { 
            success: false, 
            error: "UNEXPECTED_ERROR", 
            message: "Error técnico al intentar eliminar la factura. Intente nuevamente." 
        };
    }
}

export async function markInvoiceSent(projectId: string, invoiceId: string, sentDate: string) {
    const scope = await requireOperationalScope();
    const supabase = await createClient();

    const { error } = await supabase.from('Invoice').update({
        sent: true,
        sentDate: new Date(sentDate).toISOString(),
        updatedAt: new Date().toISOString()
    }).eq('id', invoiceId).eq('organizationId', scope.orgId);

    if (error) throw new Error(`Error actualizando factura: ${error.message}`);

    await AuditService.logAction({projectId: projectId, action: 'INVOICE_UPDATE', details: `Factura marcada como enviada`});

    // Update Project Next Action
    await supabase.from('Project').update({
        nextAction: 'Seguimiento Pago',
        nextActionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Check in 7 days
    }).eq('id', projectId).eq('organizationId', scope.orgId);

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}


export async function registerPayment(projectId: string, invoiceId: string, amount: number) {
    const scope = await requirePermission('FINANCE_VIEW');
    await ensureNotPaused(scope.orgId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'SYSTEM';

    // Call Service
    // method is hardcoded 'MANUAL' or passed? Existing fn signature only has amount.
    // 'reference' is null.
    await InvoiceService.registerPayment(invoiceId, amount, 'MANUAL', null, userId, scope.orgId);

    // Check if Project is Fully Paid logic could go here or be handled by logic inside component calling closeProject
    return { success: true, isFullyPaid: true };
}
