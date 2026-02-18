import prisma from "@/lib/prisma";
import crypto from "crypto";

export type ExperimentVariant = string;

export class ExperimentService {
    /**
     * Gets or assigns a variant for an organization for a specific experiment.
     * Assignment is deterministic based on organizationId and experimentKey.
     */
    static async getVariant(organizationId: string, experimentKey: string): Promise<ExperimentVariant> {
        // 1. Check if experiment exists and is enabled
        const experiment = await (prisma as any).experiment.findUnique({
            where: { key: experimentKey },
            include: { assignments: { where: { organizationId } } }
        });

        if (!experiment || !experiment.enabled) {
            return 'CONTROL'; // Default fallback
        }

        // 2. Check for existing persistent assignment
        if (experiment.assignments.length > 0) {
            return experiment.assignments[0].variant;
        }

        // 3. Deterministic Hashing for new assignment
        // hash = md5(orgId + experimentKey) % variants.length
        const variants = experiment.variants as string[];
        if (!variants || variants.length === 0) return 'CONTROL';

        const hash = crypto.createHash('md5').update(organizationId + experimentKey).digest('hex');
        const index = parseInt(hash.substring(0, 8), 16) % variants.length;
        const assignedVariant = variants[index];

        // 4. Persist assignment
        try {
            await (prisma as any).experimentAssignment.create({
                data: {
                    organizationId,
                    experimentId: experiment.id,
                    variant: assignedVariant
                }
            });
        } catch (error) {
            // Likely race condition/unique constraint, ignore and return the hash result
            console.warn(`[Experiment] Assignment race condition for ${experimentKey} on ${organizationId}`);
        }

        return assignedVariant;
    }

    /**
     * Force an experiment assignment (useful for Superadmin / Dev).
     */
    static async setVariant(organizationId: string, experimentKey: string, variant: string) {
        const experiment = await (prisma as any).experiment.findUnique({ where: { key: experimentKey } });
        if (!experiment) throw new Error("Experiment not found");

        await (prisma as any).experimentAssignment.upsert({
            where: {
                organizationId_experimentId: {
                    organizationId,
                    experimentId: experiment.id
                }
            },
            update: { variant },
            create: {
                organizationId,
                experimentId: experiment.id,
                variant
            }
        });
    }

    /**
     * Initializes core experiments if they don't exist.
     */
    static async initExperiments() {
        const coreExperiments = [
            { key: 'EX_BANNER_URGENCY', variants: ['SOFT', 'STRONG'] },
            { key: 'EX_PAYWALL_COPY', variants: ['FUNCTIONAL', 'EMOTIONAL'] },
            { key: 'EX_CHECKLIST_ORDER', variants: ['ITEM_FOCUS', 'TEAM_FOCUS'] }
        ];

        for (const ex of coreExperiments) {
            await (prisma as any).experiment.upsert({
                where: { key: ex.key },
                update: {},
                create: {
                    key: ex.key,
                    variants: ex.variants,
                    enabled: true
                }
            });
        }
    }
}
