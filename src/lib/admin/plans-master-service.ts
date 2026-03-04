import prisma from "@/lib/prisma";
import { resolveSuperadminAccess } from "@/lib/auth/server-resolver";

/**
 * PlansMasterService (v1.0)
 * Logic for managing global pricing plans.
 */
export class PlansMasterService {
    
    private static async verifyAccess() {
        const access = await resolveSuperadminAccess();
        if (!access.isSuperadmin) throw new Error("FORBIDDEN");
    }

    static async getPlans() {
        await this.verifyAccess();
        return prisma.plan.findMany({
            orderBy: { price: 'asc' }
        });
    }

    static async createPlan(data: any) {
        await this.verifyAccess();
        return prisma.plan.create({ data });
    }

    static async updatePlan(id: string, data: any) {
        await this.verifyAccess();
        return prisma.plan.update({ where: { id }, data });
    }
}
