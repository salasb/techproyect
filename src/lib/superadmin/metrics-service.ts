import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export interface MonthlyMetrics {
    month: string;
    revenue: number;
    activeOrgs: number;
    newOrgs: number;
    failedPayments: number;
}

export class MetricsService {
    /**
     * Ensures the current user is a SUPERADMIN
     */
    private static async ensureSuperadmin() {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { role: true }
        });

        if (profile?.role !== 'SUPERADMIN') {
            throw new Error("Unauthorized: Superadmin role required");
        }
    }

    /**
     * Get aggregated metrics for the last 6 months.
     */
    static async getAggregatedMonthlyMetrics(): Promise<MonthlyMetrics[]> {
        await this.ensureSuperadmin();

        const metrics: MonthlyMetrics[] = [];
        const now = new Date();

        // Iterate backwards for the last 6 months
        for (let i = 5; i >= 0; i--) {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

            // Format month label like "ENE 24"
            const monthLabel = startOfMonth.toLocaleString('es-ES', { month: 'short' }).toUpperCase() + ' ' + startOfMonth.getFullYear().toString().slice(-2);

            // 1. Active Orgs (snapshot of orgs that exist and are active)
            const activeOrgs = await prisma.organization.count({
                where: {
                    createdAt: { lte: endOfMonth },
                    status: 'ACTIVE'
                }
            });

            // 2. New Orgs (created in this month)
            const newOrgs = await prisma.organization.count({
                where: {
                    createdAt: { gte: startOfMonth, lte: endOfMonth }
                }
            });

            // 3. Revenue (Aggregated from local completed PaymentRecords)
            const paymentAgg = await prisma.paymentRecord.aggregate({
                where: {
                    recordedAt: { gte: startOfMonth, lte: endOfMonth },
                    status: 'COMPLETED'
                },
                _sum: { amount: true }
            });

            // 4. Failed Payments
            const failedPayments = await prisma.paymentRecord.count({
                where: {
                    recordedAt: { gte: startOfMonth, lte: endOfMonth },
                    status: 'FAILED'
                }
            });

            metrics.push({
                month: monthLabel,
                revenue: paymentAgg._sum.amount || 0,
                activeOrgs,
                newOrgs,
                failedPayments
            });
        }

        return metrics;
    }
}
