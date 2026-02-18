'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { AuditService } from "@/services/auditService";
import { getOrganizationId } from "@/lib/current-org";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";
import { ActivationService } from "@/services/activation-service";

export async function sendQuote(projectId: string) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
    const supabase = await createClient();

    // 1. Fetch current project and client
    const { data: project } = await supabase
        .from('Project')
        .select('*, client:Client(*), quoteItems:QuoteItem(*)')
        .eq('id', projectId)
        .single();

    if (!project) throw new Error("Proyecto no encontrado");

    // 2. Promotion Logic: PROSPECT -> CLIENT
    if (project.client && (project.client as any).status === 'PROSPECT') {
        const { error: promoError } = await supabase
            .from('Client')
            .update({ status: 'CLIENT' })
            .eq('id', (project as any).clientId);

        if (promoError) console.error("Error promoting client:", promoError);
    }

    // 3. Versioning Logic: Create Snapshot if it's the first one or update DRAFT
    const { data: latestQuotes } = await supabase
        .from('Quote')
        .select('*')
        .eq('projectId', projectId)
        .order('version', { ascending: false })
        .limit(1);

    const latest = latestQuotes?.[0];
    let quoteId: string;

    if (!latest || latest.status !== 'DRAFT') {
        // Create new version
        const nextVersion = (latest?.version || 0) + 1;
        const { data: newQuote, error } = await supabase
            .from('Quote')
            .insert({
                projectId,
                organizationId: orgId,
                version: nextVersion,
                status: 'SENT',
                frozenAt: new Date().toISOString(),
                totalNet: (project as any).quoteItems?.filter((i: any) => i.isSelected).reduce((acc: number, item: any) => acc + (item.priceNet * item.quantity), 0) || 0
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating quote snapshot:", error);
            throw new Error("Error creating quote snapshot");
        }
        quoteId = newQuote.id;

        // Milestone: First Quote Created
        await ActivationService.trackFirst('FIRST_QUOTE_DRAFT_CREATED', orgId, undefined, quoteId);

        // Link current items to this quote
        if ((project as any).quoteItems) {
            for (const item of (project as any).quoteItems) {
                await supabase.from('QuoteItem').update({ quoteId }).eq('id', item.id);
            }
        }
    } else {
        // Update existing DRAFT to SENT
        const { data: updatedQuote, error } = await supabase
            .from('Quote')
            .update({
                status: 'SENT',
                frozenAt: new Date().toISOString(),
                totalNet: (project as any).quoteItems?.filter((i: any) => i.isSelected).reduce((acc: number, item: any) => acc + (item.priceNet * item.quantity), 0) || 0
            })
            .eq('id', latest.id)
            .select()
            .single();

        if (error) throw new Error("Error updating draft quote");
        quoteId = updatedQuote.id;
    }

    // 4. Update Project Status
    await supabase.from('Project').update({
        status: 'EN_ESPERA',
        stage: 'COTIZACION',
        quoteSentDate: new Date().toISOString(),
        nextAction: 'Seguimiento Cotización',
        nextActionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }).eq('id', projectId);

    // 5. Audit & Logs
    const logContent = `Cotización v${latest?.status === 'DRAFT' ? latest.version : (latest?.version || 0) + 1} enviada al cliente.`;
    await supabase.from('ProjectLog').insert({
        projectId,
        organizationId: orgId,
        content: logContent,
        type: 'MILESTONE'
    });
    await AuditService.logAction(projectId, 'QUOTE_SEND', logContent);

    // 6. Automation: Create follow-up task for 2 business days
    // This feeds the Command Center and 'Next Best Action'
    const dueIn2Days = new Date();
    dueIn2Days.setDate(dueIn2Days.getDate() + 2);

    await supabase.from('Task').insert({
        organizationId: orgId,
        projectId,
        title: `Seguimiento Cotización: ${project.name}`,
        description: `Se envió la cotización. Llamar al cliente para confirmar recepción y resolver dudas.`,
        priority: 1, // Medium-High
        status: 'PENDING',
        type: 'SENTINEL', // Use SENTINEL type to distinguish as system-generated
        dueDate: dueIn2Days.toISOString()
    });

    // Milestone: First Quote Sent
    await ActivationService.trackFirst('FIRST_QUOTE_SENT', orgId, undefined, quoteId);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/quote`);
    return { success: true };
}

export async function createQuoteRevision(projectId: string) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
    const supabase = await createClient();

    // 1. Get latest SENT quote
    const { data: latestQuotes } = await supabase
        .from('Quote')
        .select('*, items:QuoteItem(*)')
        .eq('projectId', projectId)
        .order('version', { ascending: false })
        .limit(1);

    const latest = latestQuotes?.[0];
    if (!latest) throw new Error("No hay cotizaciones para revisar");
    if (latest.status === 'DRAFT') return { success: true, quoteId: latest.id }; // Already has a draft

    // 2. Create vN+1 as DRAFT
    const { data: newQuote, error: qError } = await supabase
        .from('Quote')
        .insert({
            projectId,
            organizationId: orgId,
            version: latest.version + 1,
            status: 'DRAFT',
            totalNet: latest.totalNet
        })
        .select()
        .single();

    if (qError) throw new Error("Error al crear revisión de cotización");

    // 3. Clone items
    if ((latest as any).items) {
        const itemsToInsert = (latest as any).items.map((item: any) => ({
            id: crypto.randomUUID(), // New items need new IDs
            projectId: item.projectId,
            organizationId: orgId,
            quoteId: newQuote.id,
            sku: item.sku,
            detail: item.detail,
            quantity: item.quantity,
            unit: item.unit,
            priceNet: item.priceNet,
            costNet: item.costNet,
            isSelected: item.isSelected
        }));

        await supabase.from('QuoteItem').insert(itemsToInsert);
    }

    revalidatePath(`/projects/${projectId}/quote`);
    return { success: true, quoteId: newQuote.id };
}

export async function toggleQuoteAcceptance(projectId: string, isAccepted: boolean) {
    const orgId = await getOrganizationId();
    await ensureNotPaused(orgId);
    const supabase = await createClient();
    const acceptedAt = isAccepted ? new Date().toISOString() : null;

    // Update Project
    const { error } = await supabase
        .from('Project')
        .update({ acceptedAt } as any)
        .eq('id', projectId);

    if (error) throw new Error("Failed to update quote acceptance status");

    // Update Quote status if exists
    const { data: latestQuotes } = await supabase
        .from('Quote')
        .select('*')
        .eq('projectId', projectId)
        .order('version', { ascending: false })
        .limit(1);

    if (latestQuotes?.[0]) {
        await supabase.from('Quote')
            .update({ status: isAccepted ? 'ACCEPTED' : 'SENT' })
            .eq('id', latestQuotes[0].id);
    }

    // Log the action in ProjectLog
    const logContent = isAccepted
        ? "Cotización Aceptada Digitalmente (Timbre Generado)"
        : "Aceptación Digital Revocada";

    await supabase.from('ProjectLog').insert({
        projectId,
        organizationId: orgId,
        content: logContent,
        type: 'MILESTONE'
    });

    await AuditService.logAction(projectId, 'QUOTE_ACCEPTANCE_TOGGLE', logContent);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/quote`);
    return { success: true };
}
