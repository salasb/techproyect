'use server'

import { requireOperationalScope } from "@/lib/auth/server-resolver";
import { ActivationService } from "@/services/activation-service";

/**
 * Gets global analytics for the Superadmin Dashboard.
 * Restricted to Superadmins.
 */
export async function getGlobalAnalytics() {
    const scope = await requireOperationalScope();
    if (!scope.isSuperadmin) {
        throw new Error("Unauthorized: Superadmin only");
    }

    try {
        const [funnel, ttv] = await Promise.all([
            ActivationService.getGlobalFunnelStats(),
            ActivationService.getAverageTtv()
        ]);

        return {
            success: true,
            data: {
                funnel,
                averageTtvDays: ttv
            }
        };
    } catch (error: any) {
        console.error("[AnalyticsAction] Failed to fetch analytics:", error);
        return { success: false, error: error.message };
    }
}
