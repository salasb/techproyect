'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { AuditService } from "@/services/auditService";
import { requireOperationalScope, requirePermission } from "@/lib/auth/server-resolver";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import { ActivationService } from "@/services/activation-service";
import { QuoteService } from "@/services/quoteService";
import prisma from "@/lib/prisma";
import { checkSubscriptionLimit } from "@/lib/subscriptions";

export async function sendQuote(projectId: string) {
    const scope = await requirePermission('QUOTES_MANAGE');
    await ensureNotPaused(scope.orgId);

    // Entitlement: Monthly Quote Limit
    const limitCheck = await checkSubscriptionLimit(scope.orgId, 'quotes');
    if (!limitCheck.allowed) throw new Error(limitCheck.message);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'SYSTEM';

    // 1. Fetch current project and client
    const project = await prisma.project.findUnique({
        where: { id: projectId, organizationId: scope.orgId },
        include: { client: true }
    });

    if (!project) throw new Error("Proyecto no encontrado");

    // 2. Promotion Logic: PROSPECT -> CLIENT
    if (project.clientId && (project.client as any)?.status === 'PROSPECT') {
        const { error: promoError } = await supabase
            .from('Client')
            .update({ status: 'CLIENT' })
            .eq('id', project.clientId)
            .eq('organizationId', scope.orgId);

        if (promoError) console.error("Error promoting client:", promoError);
    }

    // 3. Ensure Draft Quote exists from Project Items
    // Check if there is a DRAFT quote
    let draftQuote = await prisma.quote.findFirst({
        where: { projectId, status: 'DRAFT', project: { organizationId: scope.orgId } }
    });

    if (!draftQuote) {
        // If no draft, create one from project items (Snapshot v1 or vN)
        draftQuote = await QuoteService.createFromProject(projectId, userId, scope.orgId);
    }

    // 4. Send Quote via Service (Handles project status/action sync)
    const sentQuote = await QuoteService.sendQuote(draftQuote.id, userId, scope.orgId);

    // 5. Automation: Create follow-up task
    const dueIn2Days = new Date();
    dueIn2Days.setDate(dueIn2Days.getDate() + 2);

    await prisma.task.create({
        data: {
            organizationId: scope.orgId,
            projectId,
            title: `Seguimiento Cotización: ${project.name}`,
            description: `Se envió la cotización v${sentQuote.version}. Llamar al cliente para confirmar recepción y resolver dudas.`,
            priority: 1, // Medium-High
            status: 'PENDING',
            type: 'SENTINEL',
            dueDate: dueIn2Days
        }
    });

    // Milestone: First Quote Sent
    await ActivationService.trackFirst('FIRST_QUOTE_SENT', scope.orgId, undefined, sentQuote.id);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/quote`);
    revalidatePath(`/quotes`);
    return { success: true };
}

export async function rejectQuote(projectId: string) {
    const scope = await requirePermission('QUOTES_MANAGE');
    await ensureNotPaused(scope.orgId);

    const { data: { user } } = await (await createClient()).auth.getUser();
    const userId = user?.id || 'SYSTEM';

    const latestQuote = await prisma.quote.findFirst({
        where: { projectId, project: { organizationId: scope.orgId } },
        orderBy: { version: 'desc' }
    });

    if (latestQuote) {
        await QuoteService.rejectQuote(latestQuote.id, userId, scope.orgId);
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/quote`);
    revalidatePath(`/quotes`);
    
    return { success: true };
}

export async function createQuoteRevision(projectId: string) {
    const scope = await requirePermission('QUOTES_MANAGE');
    await ensureNotPaused(scope.orgId);

    // Entitlement: Monthly Quote Limit
    const limitCheck = await checkSubscriptionLimit(scope.orgId, 'quotes');
    if (!limitCheck.allowed) throw new Error(limitCheck.message);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'SYSTEM';

    // 1. Get latest quote to revise
    const latestQuote = await prisma.quote.findFirst({
        where: { projectId, project: { organizationId: scope.orgId } },
        orderBy: { version: 'desc' }
    });

    if (!latestQuote) throw new Error("No hay cotizaciones para revisar");
    if (latestQuote.status === 'DRAFT') return { success: true, quoteId: latestQuote.id }; // Already has a draft

    // 2. Revise via Service
    const newQuote = await QuoteService.reviseQuote(latestQuote.id, userId, scope.orgId);

    revalidatePath(`/projects/${projectId}/quote`);
    return { success: true, quoteId: newQuote.id };
}

export async function toggleDigitalAcceptanceEnabled(projectId: string, enabled: boolean) {
    const scope = await requirePermission('QUOTES_MANAGE');
    await ensureNotPaused(scope.orgId);
    
    await prisma.project.update({
        where: { id: projectId, organizationId: scope.orgId },
        data: { digitalAcceptance: enabled }
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/quote`);
    
    return { success: true };
}

export async function toggleQuoteAcceptance(projectId: string, isAccepted: boolean) {
    const scope = await requirePermission('QUOTES_MANAGE');
    await ensureNotPaused(scope.orgId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'SYSTEM';

    const acceptedAt = isAccepted ? new Date() : null;
    const newStatus = isAccepted ? 'EN_CURSO' : 'EN_ESPERA';

    // Update Quote status using Service first (it ensures consistency and emits webhooks)
    const latestQuote = await prisma.quote.findFirst({
        where: { projectId, project: { organizationId: scope.orgId } },
        orderBy: { version: 'desc' }
    });

    if (latestQuote) {
        if (isAccepted) {
            // Force status to SENT if it wasn't, to allow manual acceptance of a drafted quote
            if (latestQuote.status !== 'SENT') {
                await prisma.quote.update({ where: { id: latestQuote.id }, data: { status: 'SENT' } });
                await prisma.project.update({ where: { id: projectId }, data: { quoteSentDate: new Date() } });
            }
            await QuoteService.acceptQuote(latestQuote.id, userId, scope.orgId);
            
            try {
                const { InvoiceService } = await import("@/services/invoiceService");
                await InvoiceService.generateFromQuote(latestQuote.id, userId, scope.orgId);
            } catch (invoiceError) {
                console.error("[QuoteAcceptance] Failed to auto-generate invoice:", invoiceError);
            }
        } else {
            await QuoteService.revokeAcceptance(latestQuote.id, userId, scope.orgId);
        }
    } else {
        // No formal Quote exists (early-stage project). We just update the Project.
        await prisma.project.update({
            where: { id: projectId, organizationId: scope.orgId },
            data: { 
                acceptedAt,
                status: newStatus as any,
                stage: isAccepted ? 'DISENO' : 'COTIZACION'
            }
        });
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/quote`);
    return { success: true };
}
