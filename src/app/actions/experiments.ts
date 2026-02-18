'use server'

import { ExperimentService } from "@/services/experiment-service";
import { getOrganizationId } from "@/lib/current-org";

export async function getExperimentVariant(experimentKey: string) {
    const orgId = await getOrganizationId();
    if (!orgId) return 'CONTROL';
    return ExperimentService.getVariant(orgId, experimentKey);
}

/**
 * Utility to initialize all system experiments.
 */
export async function initializeExperimentsAction() {
    await ExperimentService.initExperiments();
    return { success: true };
}
