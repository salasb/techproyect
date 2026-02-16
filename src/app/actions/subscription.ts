'use server'

import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/current-org";
import { revalidatePath } from "next/cache";

export async function requestUpgrade(plan: 'PRO' | 'ENTERPRISE') {
    const orgId = await getOrganizationId();
    const supabase = await createClient();

    // 1. Get User Info
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 2. Log the Request (In a real app, this would email Sales/Admin)
    // For now, we'll insert into a 'ContactRequest' or just AuditLog
    await supabase.from('AuditLog').insert({
        id: crypto.randomUUID(),
        organizationId: orgId,
        actorId: user.id,
        action: 'SUBSCRIPTION_UPGRADE_REQUEST',
        details: `Solicitud de actualización a Plan ${plan}`,
        createdAt: new Date().toISOString()
    });

    // 3. Optional: Create a notification for Admins (if notification system exists)
    // await createNotification({ ... })

    console.log(`[SUBSCRIPTION] Upgrade requested for Org ${orgId} to ${plan} by ${user.email}`);

    return { success: true, message: "Solicitud enviada. Un ejecutivo te contactará en breve." };
}
