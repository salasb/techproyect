import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";

export class AdminService {
    /**
     * Get SaaS-wide metrics for all organizations
     */
    static async getSaaSMetrics() {
        const supabase = await createClient();

        // 1. Fetch all organizations and their stats
        const { data: orgs } = await supabase
            .from('Organization')
            .select(`
                id,
                name,
                plan,
                status,
                createdAt,
                stats:OrganizationStats(*),
                profiles:Profile(id)
            `);

        if (!orgs) return [];

        return orgs.map(org => {
            const stats = org.stats as any;
            const usersCount = (org.profiles as any[]).length;

            // Calculate health score based on activity and stats
            // Simplistic health score logic:
            // - Active in last 3 days: +40
            // - Has at least 1 project: +20
            // - Has at least 1 quote: +20
            // - Has more than 1 user: +20
            let calculatedHealth = 0;
            const lastActivity = stats?.lastActivityAt ? new Date(stats.lastActivityAt) : null;
            const now = new Date();
            const daysSinceActivity = lastActivity ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)) : 100;

            if (daysSinceActivity <= 3) calculatedHealth += 40;
            else if (daysSinceActivity <= 7) calculatedHealth += 20;

            if (stats?.projectsCount > 0) calculatedHealth += 20;
            if (stats?.quotesCount > 0) calculatedHealth += 20;
            if (usersCount > 1) calculatedHealth += 20;

            return {
                id: org.id,
                name: org.name,
                plan: org.plan,
                status: org.status,
                createdAt: org.createdAt,
                usersCount,
                metrics: {
                    wau: stats?.wau || 0,
                    mau: stats?.mau || 0,
                    activationDays: stats?.daysToFirstQuote || 'N/A',
                    moduleUsage: {
                        crm: stats?.crmCount || 0,
                        quotes: stats?.quotesCount || 0,
                        projects: stats?.projectsCount || 0,
                        inventory: stats?.inventoryCount || 0,
                    }
                },
                health: {
                    score: calculatedHealth,
                    status: calculatedHealth > 70 ? 'HEALTHY' : calculatedHealth > 30 ? 'WARNING' : 'CRITICAL',
                    lastActivityAt: stats?.lastActivityAt
                }
            };
        });
    }

    /**
     * Get global SaaS aggregations
     */
    static async getGlobalStats() {
        const supabase = await createClient();

        const [orgsRes, usersRes, projectsRes] = await Promise.all([
            supabase.from('Organization').select('id', { count: 'exact' }),
            supabase.from('Profile').select('id', { count: 'exact' }),
            supabase.from('Project').select('id', { count: 'exact' })
        ]);

        return {
            totalOrganizations: orgsRes.count || 0,
            totalUsers: usersRes.count || 0,
            totalProjects: projectsRes.count || 0,
            activeSubscriptionCount: 0, // Placeholder
            mrr: 0 // Placeholder
        };
    }
}
