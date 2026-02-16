'use server'

import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/current-org";
import { revalidatePath } from "next/cache";

export async function requestUpgrade(planId: string) {
    const orgId = await getOrganizationId();
    const supabase = await createClient();

    // 1. Get User Info
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 2. Validate Plan Exists
    const { data: plan } = await supabase.from('Plan').select('name').eq('id', planId).single();
    if (!plan) throw new Error("Plan not found");

    // 3. Log the Request (In a real app, this would email Sales/Admin)
    // For now, we'll insert into a 'ContactRequest' or just AuditLog
    await supabase.from('AuditLog').insert({
        organizationId: orgId,
        actorId: user.id || null, // Ensure actorId is not undefined if user exists
        action: 'SUBSCRIPTION_UPGRADE_REQUEST',
        details: `Solicitud de actualización a Plan ${plan.name} (${planId})`,
        createdAt: new Date().toISOString()
    });

    // 4. Create Notification Implementation (Placeholder for now)
    console.log(`[SUBSCRIPTION] Upgrade requested for Org ${orgId} to ${planId} by ${user.email}`);

    return { success: true, message: "Solicitud enviada. Un ejecutivo te contactará en breve." };
}
