'use server'

import { ExperimentService } from "@/services/experiment-service";
import { requireOperationalScope } from "@/lib/auth/server-resolver";

export async function getExperimentVariant(experimentKey: string) {
    try {
        const scope = await requireOperationalScope();
        return ExperimentService.getVariant(scope.orgId, experimentKey);
    } catch (e) {
        return 'CONTROL';
    }
}

/**
 * Utility to initialize all system experiments.
 */
export async function initializeExperimentsAction() {
    await ExperimentService.initExperiments();
    return { success: true };
}
