import { Database } from '@/types/supabase';
import { calculateProjectFinancials } from './financialCalculator';

type Project = Database['public']['Tables']['Project']['Row'] & {
    company: Database['public']['Tables']['Company']['Row'] | null;
    invoices: Database['public']['Tables']['Invoice']['Row'][];
    costEntries: Database['public']['Tables']['CostEntry']['Row'][];
    quoteItems: Database['public']['Tables']['QuoteItem']['Row'][];
};

export class DashboardService {
    static getFocusBoardData(projects: Project[], settings: Database['public']['Tables']['Settings']['Row']) {
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
            .map(p => {
                // Calculate Financial Health
                const fin = calculateProjectFinancials(p, p.costEntries, p.invoices, settings, p.quoteItems);

                return {
                    id: p.id,
                    name: p.name,
                    status: p.status,
                    companyName: p.company?.name || 'Sin Cliente',
                    companyContactName: p.company?.contactName,
                    companyPhone: p.company?.phone,
                    companyEmail: p.company?.email,
                    nextAction: p.nextAction,
                    nextActionDate: p.nextActionDate,
                    blockingReason: p.blockingReason,
                    financialHealth: fin.trafficLightFinancial // Pass health status
                };
            });

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

        const dataMap = new Map<string, { label: string, income: number, cost: number, profit: number, dateVal: number }>();

        // Pre-fill last X months if using monthly view
        if (dateFormat === 'month' && period !== 'all') {
            const monthsBack = period === '12m' ? 12 : 6;
            for (let i = monthsBack - 1; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = d.toLocaleString('es-CL', { month: 'short', year: '2-digit' });
                const label = d.toLocaleString('es-CL', { month: 'short' });
                dataMap.set(key, {
                    label: label.charAt(0).toUpperCase() + label.slice(1),
                    income: 0,
                    cost: 0,
                    profit: 0,
                    dateVal: d.getTime()
                });
            }
        }

        projects.forEach(p => {
            // Cost (Expenses)
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
                            cost: 0,
                            profit: 0,
                            dateVal: dateFormat === 'day' ? d.getTime() : new Date(d.getFullYear(), d.getMonth(), 1).getTime()
                        });
                    }
                    dataMap.get(key)!.cost += c.amountNet;
                }
            });

            // Income (Invoices Sent)
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
                                cost: 0,
                                profit: 0,
                                dateVal: dateFormat === 'day' ? d.getTime() : new Date(d.getFullYear(), d.getMonth(), 1).getTime()
                            });
                        }
                        dataMap.get(key)!.income += inv.amountInvoicedGross; // Using Gross for Cash Flow representation
                    }
                }
            });
        });

        // Calculate Profit and Format
        return Array.from(dataMap.values())
            .map(item => ({
                ...item,
                profit: item.income - item.cost,
                name: item.label // Compatibility with Recharts naming
            }))
            .sort((a, b) => a.dateVal - b.dateVal);
    }

    static getTopClients(projects: Project[]) {
        const clientMap = new Map<string, number>();
        projects.forEach((p) => {
            const cName = p.company?.name || 'Sin Cliente';
            // Determine active contract value (e.g., Sold)
            // Ideally we sum up quote items. But simplified: use 'budget' or 'price' if calculated.
            // Since we pass raw projects here, we might need to rely on 'budget' field if available or sum invoices?
            // Let's use Sum of Invoices for "Revenue" or Budget for "Sales Volume".
            // The prompt implies "Revenue" (Ingresos). Let's sum Invoiced Amount.
            const revenue = p.invoices?.reduce((acc, inv) => acc + (inv.sent ? inv.amountInvoicedGross : 0), 0) || 0;
            clientMap.set(cName, (clientMap.get(cName) || 0) + revenue);
        });

        return Array.from(clientMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7); // Top 7
    }

    static getProjectMargins(processedProjects: any[]) {
        // Accepts projects that already have 'financials' calculated
        return processedProjects
            .filter((p: any) => p.financials.priceNet > 0)
            .sort((a: any, b: any) => b.financials.priceNet - a.financials.priceNet)
            .slice(0, 10)
            .map((p: any) => ({
                name: p.name.substring(0, 15) + (p.name.length > 15 ? '...' : ''),
                marginPct: p.financials.priceNet > 0 ? (p.financials.marginAmountNet / p.financials.priceNet) * 100 : 0
            }));
    }

    static getCashFlowProjection(projects: Project[]) {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1); // Start of next month
        const threeMonthsLater = new Date(now.getFullYear(), now.getMonth() + 4, 1); // 3 months window

        const projectionMap = new Map<string, number>();

        // Init buckets
        for (let i = 0; i < 3; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
            const key = d.toLocaleString('es-CL', { month: 'long', year: 'numeric' });
            projectionMap.set(key, 0);
        }

        projects.forEach(p => {
            p.invoices?.forEach(inv => {
                if (inv.sent && !inv.amountPaidGross) { // Sent but not fully paid (simplified check)
                    // In a real scenario, we'd check balance due. Here assuming checks "Paid" status or amount.
                    // Let's assume calculated fields earlier handle "Receivable". 
                    // But here we work with raw invoices. 
                    // If amountPaidGross < amountInvoicedGross, it's pending.

                    if (inv.amountPaidGross < inv.amountInvoicedGross) {
                        const amountDue = inv.amountInvoicedGross - inv.amountPaidGross;
                        let dueDate = inv.dueDate ? new Date(inv.dueDate) : null;

                        // If no due date, assume Sent Date + 30 days
                        if (!dueDate && inv.sentDate) {
                            dueDate = new Date(inv.sentDate);
                            dueDate.setDate(dueDate.getDate() + 30);
                        }

                        if (dueDate) {
                            if (dueDate >= nextMonth && dueDate < threeMonthsLater) {
                                const key = dueDate.toLocaleString('es-CL', { month: 'long', year: 'numeric' });
                                if (projectionMap.has(key)) {
                                    projectionMap.set(key, (projectionMap.get(key) || 0) + amountDue);
                                }
                            }
                        }
                    }
                }
            });
        });

        return Array.from(projectionMap.entries())
        value
    }));
}

    static getAlerts(projects: Project[], settings: Database['public']['Tables']['Settings']['Row']) {
    const alerts: { type: 'danger' | 'warning', message: string, link?: string }[] = [];
    const now = new Date();

    projects.forEach(p => {
        // 1. Low Margin Alerts (Active Projects only)
        if (p.status === 'EN_CURSO' || p.status === 'EN_ESPERA') {
            const fin = calculateProjectFinancials(p, p.costEntries, p.invoices, settings, p.quoteItems);
            // Check Traffic Light Financial directly
            if (fin.trafficLightFinancial === 'RED') {
                alerts.push({
                    type: 'danger',
                    message: `Bajo Margen: ${p.name}`,
                    link: `/projects/${p.id}/financials`
                });
            }
        }

        // 2. Overdue Invoices
        p.invoices?.forEach(inv => {
            if (inv.sent && !inv.amountPaidGross) {
                // Check if Overdue
                let dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
                if (!dueDate && inv.sentDate) {
                    const terms = inv.paymentTermsDays ?? settings.defaultPaymentTermsDays;
                    dueDate = new Date(inv.sentDate);
                    dueDate.setDate(dueDate.getDate() + terms);
                }

                if (dueDate && dueDate < now) {
                    // It is overdue
                    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                    if (daysOverdue > 7) { // Only alert if > 7 days late to reduce noise
                        alerts.push({
                            type: 'warning',
                            message: `Pago Atrasado (${daysOverdue} días): ${p.name}`,
                            link: `/projects/${p.id}/invoices`
                        });
                    }
                }
            }
        });
    });

    return alerts.slice(0, 10); // Limit to 10 alerts
}
}
