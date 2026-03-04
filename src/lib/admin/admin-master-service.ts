import prisma from "@/lib/prisma";
import { resolveSuperadminAccess } from "@/lib/auth/server-resolver";

/**
 * AdminMasterService (v1.0)
 * Exclusive use of Prisma for Superadmin operations.
 * Bypasses PostgREST/RLS by using the direct database connection.
 */
export class AdminMasterService {
    
    private static async verifyAccess() {
        const access = await resolveSuperadminAccess();
        if (!access.isSuperadmin) {
            throw new Error("FORBIDDEN: Superadmin access required");
        }
        return access;
    }

    /**
     * PLANS: Master list of pricing plans.
     * Note: If 'Plan' model doesn't exist, we fallback to specific metadata or settings.
     */
    static async getGlobalPlans() {
        await this.verifyAccess();
        // Since 'Plan' might be a JSON in Settings or a separate model, 
        // we fetch the global settings which contain the plan definitions.
        const settings = await prisma.settings.findFirst();
        return settings; 
    }

    /**
     * SUBSCRIPTIONS: All active subscriptions across all organizations.
     */
    static async getAllSubscriptions() {
        await this.verifyAccess();
        return prisma.subscription.findMany({
            include: {
                organization: {
                    select: { name: true, plan: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * USERS: Global user directory.
     */
    static async getGlobalUsers() {
        await this.verifyAccess();
        return prisma.profile.findMany({
            include: {
                organization: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
    }

    /**
     * SETTINGS: System-wide configuration.
     */
    static async getSystemSettings() {
        await this.verifyAccess();
        return prisma.settings.findFirst();
    }
}
