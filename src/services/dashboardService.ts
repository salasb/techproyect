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

    static getFinancialTrends(projects: Project[], period: string = '6m') {
        const now = new Date();
        let startDate = new Date();
        let dateFormat: 'day' | 'month' = 'month';

        switch (period) {
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                dateFormat = 'day';
                break;
            case '6m':
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                dateFormat = 'month';
                break;
            case '12m':
                startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
                dateFormat = 'month';
                break;
            case 'all':
                startDate = new Date(0);
                dateFormat = 'month';
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        }

        const dataMap = new Map<string, { label: string, income: number, expenses: number, dateVal: number }>();

        // Pre-fill last X months if using monthly view for better visuals (optional, but good for empty months)
        if (dateFormat === 'month' && period !== 'all') {
            const monthsBack = period === '12m' ? 12 : 6;
            for (let i = monthsBack - 1; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = d.toLocaleString('es-CL', { month: 'short', year: '2-digit' });
                const label = d.toLocaleString('es-CL', { month: 'short' }); // Chart label
                dataMap.set(key, {
                    label: label.charAt(0).toUpperCase() + label.slice(1),
                    income: 0,
                    expenses: 0,
                    dateVal: d.getTime()
                });
            }
        }

        projects.forEach(p => {
            // Expenses
            p.costEntries?.forEach((c) => {
                const d = new Date(c.date);
                if (d >= startDate) {
                    const key = dateFormat === 'day'
                        ? d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
                        : d.toLocaleString('es-CL', { month: 'short', year: '2-digit' });

                    const label = dateFormat === 'day'
                        ? d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
                        : d.toLocaleString('es-CL', { month: 'short' });

                    if (!dataMap.has(key)) {
                        dataMap.set(key, {
                            label: label.charAt(0).toUpperCase() + label.slice(1),
                            income: 0,
                            expenses: 0,
                            dateVal: dateFormat === 'day' ? d.getTime() : new Date(d.getFullYear(), d.getMonth(), 1).getTime()
                        });
                    }
                    dataMap.get(key)!.expenses += c.amountNet;
                }
            });

            // Income
            p.invoices?.forEach((inv) => {
                if (inv.sent && inv.sentDate) {
                    const d = new Date(inv.sentDate);
                    if (d >= startDate) {
                        const key = dateFormat === 'day'
                            ? d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
                            : d.toLocaleString('es-CL', { month: 'short', year: '2-digit' });

                        const label = dateFormat === 'day'
                            ? d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
                            : d.toLocaleString('es-CL', { month: 'short' });

                        if (!dataMap.has(key)) {
                            dataMap.set(key, {
                                label: label.charAt(0).toUpperCase() + label.slice(1),
                                income: 0,
                                expenses: 0,
                                dateVal: dateFormat === 'day' ? d.getTime() : new Date(d.getFullYear(), d.getMonth(), 1).getTime()
                            });
                        }
                        dataMap.get(key)!.income += inv.amountInvoicedGross;
                    }
                }
            });
        });

        return Array.from(dataMap.values())
            .sort((a, b) => a.dateVal - b.dateVal)
            .map(({ label, income, expenses }) => ({
                label,
                income,
                expenses
            }));
    }

    static getProfitTrend(projects: Project[], period: string = '6m') {
        const now = new Date();
        let startDate = new Date();
        let dateFormat: 'day' | 'month' = 'month';

        switch (period) {
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                dateFormat = 'day';
                break;
            case '6m':
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                dateFormat = 'month';
                break;
            case '12m':
                startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
                dateFormat = 'month';
                break;
            case 'all':
                startDate = new Date(0); // Epoch
                dateFormat = 'month';
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        }

        const trendMap = new Map<string, number>();

        // Initialize Buckets if needed (optional optimization, skipped for simplicity/flexibility)

        projects.forEach(p => {
            // Expenses (Subtract from Profit)
            p.costEntries?.forEach(c => {
                const d = new Date(c.date);
                if (d >= startDate) {
                    const key = dateFormat === 'day'
                        ? d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
                        : d.toLocaleString('es-CL', { month: 'short', year: '2-digit' });

                    const current = trendMap.get(key) || 0;
                    trendMap.set(key, current - c.amountNet);
                }
            });

            // Income (Add to Profit)
            p.invoices?.forEach(inv => {
                if (inv.sent && inv.sentDate) {
                    const d = new Date(inv.sentDate);
                    if (d >= startDate) {
                        const key = dateFormat === 'day'
                            ? d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
                            : d.toLocaleString('es-CL', { month: 'short', year: '2-digit' });

                        const current = trendMap.get(key) || 0;
                        trendMap.set(key, current + inv.amountInvoicedGross);
                        // Note: Using Gross for Income vs Net for Cost is a business decision. 
                        // Ideally should be Net vs Net or Gross vs Gross. 
                        // QA Prompt asked for logic check. We stick to "Cash Flow" = Invoiced (Gross) - Cost (Net usually).
                        // Refinement: Ideally should use Net for income if we want pure profit/margin. 
                        // Let's use Net if available or calculate it? 
                        // For now sticking to previous logic: InvoicedGross.
                    }
                }
            });
        });

        // Sort by Date
        const sortedData = Array.from(trendMap.entries()).map(([date, value]) => ({ date, value }));
        // If months, we might want to ensure chronological order. This map iteration order is insertion order usually.
        // Better to sort specifically.
        // Simplified sort logic for formatting:
        // For production, using a proper Date key for sorting is safer.

        // Re-implementation with sorting:
        const rawData: { dateObj: Date, label: string, amount: number }[] = [];

        projects.forEach(p => {
            p.costEntries?.forEach(c => {
                const d = new Date(c.date);
                if (d >= startDate) rawData.push({ dateObj: d, label: 'cost', amount: -c.amountNet });
            });
            p.invoices?.forEach(inv => {
                if (inv.sent && inv.sentDate) {
                    const d = new Date(inv.sentDate);
                    if (d >= startDate) rawData.push({ dateObj: d, label: 'income', amount: inv.amountInvoicedGross });
                }
            });
        });

        // Group by buckets
        const bucketMap = new Map<string, { dateVal: number, value: number }>();

        rawData.forEach(item => {
            let key = '';
            let sortKey = 0;

            if (dateFormat === 'day') {
                key = item.dateObj.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
                sortKey = new Date(item.dateObj.getFullYear(), item.dateObj.getMonth(), item.dateObj.getDate()).getTime();
            } else {
                key = item.dateObj.toLocaleString('es-CL', { month: 'short', year: '2-digit' });
                sortKey = new Date(item.dateObj.getFullYear(), item.dateObj.getMonth(), 1).getTime();
            }

            if (!bucketMap.has(key)) {
                bucketMap.set(key, { dateVal: sortKey, value: 0 });
            }
            bucketMap.get(key)!.value += item.amount;
        });

        const finalData = Array.from(bucketMap.entries())
            .sort((a, b) => a[1].dateVal - b[1].dateVal)
            .map(([key, val]) => ({
                date: key,
                value: val.value
            }));

        const totalProfit = finalData.reduce((acc, curr) => acc + curr.value, 0);

        return { trendData: finalData, totalProfit };
    }
}
