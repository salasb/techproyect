'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { AuditService } from "@/services/auditService";
import { requireOperationalScope } from "@/lib/auth/server-resolver";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import { ActivationService } from "@/services/activation-service";
import { QuoteService } from "@/services/quoteService";
import prisma from "@/lib/prisma";

export async function sendQuote(projectId: string) {
    const scope = await requireOperationalScope();
    await ensureNotPaused(scope.orgId);
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

    // 4. Send Quote via Service
    const sentQuote = await QuoteService.sendQuote(draftQuote.id, userId, scope.orgId);

    // 5. Update Project Status (Legacy orchestration)
    await prisma.project.update({
        where: { id: projectId, organizationId: scope.orgId },
        data: {
            status: 'EN_ESPERA',
            stage: 'COTIZACION',
            quoteSentDate: new Date(),
            nextAction: 'Seguimiento Cotización',
            nextActionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
    });

    // 6. Automation: Create follow-up task
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
    return { success: true };
}

export async function createQuoteRevision(projectId: string) {
    const scope = await requireOperationalScope();
    await ensureNotPaused(scope.orgId);
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

export async function toggleQuoteAcceptance(projectId: string, isAccepted: boolean) {
    const scope = await requireOperationalScope();
    await ensureNotPaused(scope.orgId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'SYSTEM';

    const acceptedAt = isAccepted ? new Date() : null;

    // Update Project
    await prisma.project.update({
        where: { id: projectId, organizationId: scope.orgId },
        data: { acceptedAt }
    });

    // Update Quote status using Service
    const latestQuote = await prisma.quote.findFirst({
        where: { projectId, project: { organizationId: scope.orgId } },
        orderBy: { version: 'desc' }
    });

    if (latestQuote) {
        if (isAccepted) {
            await QuoteService.acceptQuote(latestQuote.id, userId, scope.orgId);
        } else {
            await QuoteService.revokeAcceptance(latestQuote.id, userId, scope.orgId);
        }
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/quote`);
    return { success: true };
}
