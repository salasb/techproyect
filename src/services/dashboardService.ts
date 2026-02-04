import { Database } from '@/types/supabase';

type Project = Database['public']['Tables']['Project']['Row'] & {
    company: Database['public']['Tables']['Company']['Row'] | null;
    invoices: Database['public']['Tables']['Invoice']['Row'][];
    costEntries: Database['public']['Tables']['CostEntry']['Row'][];
};

export class DashboardService {
    static getFocusBoardData(projects: Project[]) {
        const blockedProjects = projects
            .filter(p => p.status === 'BLOQUEADO')
            .map(p => ({
                id: p.id,
                name: p.name,
                status: p.status,
                companyName: p.company?.name || 'Sin Cliente',
                nextAction: p.nextAction,
                nextActionDate: p.nextActionDate,
                blockingReason: p.blockingReason
            }));

        const focusProjects = projects
            .filter(p => p.status === 'EN_CURSO' || p.status === 'EN_ESPERA')
            .sort((a, b) => {
                if (!a.nextActionDate) return 1;
                if (!b.nextActionDate) return -1;
                return new Date(a.nextActionDate).getTime() - new Date(b.nextActionDate).getTime();
            })
            .map(p => ({
                id: p.id,
                name: p.name,
                status: p.status,
                companyName: p.company?.name || 'Sin Cliente',
                nextAction: p.nextAction,
                nextActionDate: p.nextActionDate,
                blockingReason: p.blockingReason
            }));

        return { blockedProjects, focusProjects };
    }

    static getFinancialTrends(projects: Project[]) {
        const monthsMap = new Map<string, { income: number; expenses: number }>();
        const now = new Date();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toLocaleString('es-CL', { month: 'short' });
            monthsMap.set(key, { income: 0, expenses: 0 });
        }

        projects.forEach(p => {
            // Aggregate Expenses
            if (p.costEntries) {
                p.costEntries.forEach((c) => {
                    const d = new Date(c.date);
                    if (d > new Date(now.getFullYear(), now.getMonth() - 6, 1)) {
                        const key = d.toLocaleString('es-CL', { month: 'short' });
                        if (monthsMap.has(key)) {
                            const curr = monthsMap.get(key)!;
                            curr.expenses += c.amountNet;
                        }
                    }
                });
            }

            // Aggregate Income
            if (p.invoices) {
                p.invoices.forEach((inv) => {
                    if (inv.sent && inv.sentDate) {
                        const d = new Date(inv.sentDate);
                        if (d > new Date(now.getFullYear(), now.getMonth() - 6, 1)) {
                            const key = d.toLocaleString('es-CL', { month: 'short' });
                            if (monthsMap.has(key)) {
                                const curr = monthsMap.get(key)!;
                                curr.income += inv.amountInvoicedGross;
                            }
                        }
                    }
                });
            }
        });

        return Array.from(monthsMap.entries()).map(([month, data]) => ({
            month: month.charAt(0).toUpperCase() + month.slice(1),
            income: data.income,
            expenses: data.expenses
        }));
    }
}
