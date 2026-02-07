'use server'

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";

type ProjectUpdate = Database['public']['Tables']['Project']['Update'];

export async function updateProjectSettings(
    projectId: string,
    data: ProjectUpdate,
    conversion?: { convertValues: boolean, conversionFactor: number }
) {
    const supabase = await createClient();

    console.log(`[UPDATE_SETTINGS] ProjectId: ${projectId}`, data);

    const { data: { user } } = await supabase.auth.getUser();
    let userName = 'Sistema';
    let userEmail = 'sistema@techwise.com';

    if (user) {
        // Fetch profile/metadata if possible, or use metadata
        userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Usuario';
        userEmail = user.email || '';
    }

    // Auto-update responsible to the current user who is editing
    const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
        responsible: userName // Always set responsible to last editor as requested
    };

    console.log(`[UPDATE_SETTINGS] ProjectId: ${projectId}`, updateData);

    const { error } = await supabase
        .from('Project')
        .update(updateData)
        .eq('id', projectId);

    // Handle currency conversion if requested
    if (conversion?.convertValues && conversion.conversionFactor && conversion.conversionFactor !== 1) {
        const factor = conversion.conversionFactor;

        // 1. Project Budget (budgetNet)
        if (data.budgetNet !== undefined) {
            // Already updated by 'data' object if included
        } else {
            // If implicit update needed
            const { data: proj } = await supabase.from('Project').select('budgetNet').eq('id', projectId).single();
            if (proj && proj.budgetNet) {
                await supabase.from('Project').update({ budgetNet: proj.budgetNet * factor }).eq('id', projectId);
            }
        }

        // 2. Costs (CostEntry: amountNet)
        const { data: costs } = await supabase.from('CostEntry').select('id, amountNet').eq('projectId', projectId);
        if (costs) {
            for (const c of costs) {
                await supabase.from('CostEntry').update({ amountNet: c.amountNet * factor }).eq('id', c.id);
            }
        }

        // 3. Quotes Items (QuoteItem: priceNet, costNet)
        const { data: items } = await supabase.from('QuoteItem').select('id, priceNet, costNet').eq('projectId', projectId);
        if (items) {
            for (const item of items) {
                await supabase.from('QuoteItem').update({
                    priceNet: item.priceNet * factor,
                    costNet: (item.costNet || 0) * factor
                }).eq('id', item.id);
            }
        }

        // 4. Invoices (Invoice: amountInvoicedGross, amountPaidGross)
        const { data: invoices } = await supabase.from('Invoice').select('id, amountInvoicedGross, amountPaidGross').eq('projectId', projectId);
        if (invoices) {
            for (const inv of invoices) {
                await supabase.from('Invoice').update({
                    amountInvoicedGross: inv.amountInvoicedGross * factor,
                    amountPaidGross: inv.amountPaidGross * factor
                }).eq('id', inv.id);
            }
        }
    }

    if (error) {
        console.error("Error updating project:", error);
        throw new Error(`Error updating project: ${error.message}`);
    }

    // Audit Log
    const changes = Object.keys(data).join(', ');
    await supabase.from('AuditLog').insert({
        projectId,
        action: 'UPDATE_SETTINGS',
        details: `Updated fields: ${changes}`,
        userName: userName
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/quotes/${projectId}`);
    revalidatePath('/projects');
    revalidatePath('/');
    revalidatePath('/', 'layout'); // Ensure global layout refresh
}
