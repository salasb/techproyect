'use server'

import { trackSlo } from "@/lib/telemetry";
import { revalidatePath } from "next/cache";

export async function simulateSloEvent(sloId: any, success: boolean) {
    // Only allowed in non-production or for superadmins (implied by context)
    console.log(`[QA] Simulating SLO ${sloId} - Success: ${success}`);
    
    await trackSlo(sloId, success, 'SYSTEM_QA', 'QA_USER');
    
    revalidatePath('/admin');
    return { success: true };
}
