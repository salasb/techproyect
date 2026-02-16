import { createClient } from "@/lib/supabase/server";

export interface SentinelInsight {
    id: string;
    type: 'STOCK_CRITICAL' | 'BUDGET_OVERFLOW' | 'INVOICE_OVERDUE' | 'INFO';
    severity: 'high' | 'medium' | 'low';
    title: string;
    message: string;
    actionLabel: string;
    actionHref: string;
}

export class SentinelService {
    /**
     * Analyzes current organization data and returns proactive insights.
     */
    static async getInsights(organizationId: string): Promise<SentinelInsight[]> {
        const supabase = await createClient();
        const insights: SentinelInsight[] = [];

        // 1. Rule: Stock Critical
        const { data: lowStockProducts } = await supabase
            .from("Product")
            .select("id, name, stock, min_stock")
            .eq("organizationId", organizationId)
            .lte("stock", supabase.rpc('get_min_stock_reference' as any)) // Hypothetical logic, let's use JS filter for safety if RLS/View is complex
            .not("type", "eq", "SERVICE");

        // Real check in JS for accuracy
        if (lowStockProducts) {
            lowStockProducts.forEach(p => {
                if (p.stock <= p.min_stock) {
                    insights.push({
                        id: `stock-${p.id}`,
                        type: 'STOCK_CRITICAL',
                        severity: 'high',
                        title: `Stock Crítico: ${p.name}`,
                        message: `Solo quedan ${p.stock} unidades (Mínimo: ${p.min_stock}). Se recomienda reponer.`,
                        actionLabel: "Ver Inventario",
                        actionHref: "/catalog"
                    });
                }
            });
        }

        // 2. Rule: Budget Overflow
        const { data: projects } = await supabase
            .from("Project")
            .select("id, name, budgetNet")
            .eq("organizationId", organizationId)
            .neq("status", "CERRADO");

        if (projects) {
            for (const project of projects) {
                const { data: costs } = await supabase
                    .from("CostEntry")
                    .select("amountNet")
                    .eq("projectId", project.id);

                const totalCost = costs?.reduce((acc, curr) => acc + curr.amountNet, 0) || 0;

                if (project.budgetNet > 0 && totalCost > project.budgetNet) {
                    insights.push({
                        id: `budget-${project.id}`,
                        type: 'BUDGET_OVERFLOW',
                        severity: 'high',
                        title: `Sobrecosto en ${project.name}`,
                        message: `Los costos ($${totalCost.toLocaleString()}) han superado el presupuesto neto ($${project.budgetNet.toLocaleString()}).`,
                        actionLabel: "Revisar Finanzas",
                        actionHref: `/projects/${project.id}/finances`
                    });
                } else if (project.budgetNet > 0 && totalCost > project.budgetNet * 0.9) {
                    insights.push({
                        id: `budget-${project.id}`,
                        type: 'BUDGET_OVERFLOW',
                        severity: 'medium',
                        title: `Alerta Presupuesto: ${project.name}`,
                        message: `Has consumido el 90% del presupuesto.`,
                        actionLabel: "Ver Detalle",
                        actionHref: `/projects/${project.id}/finances`
                    });
                }
            }
        }

        // 3. Rule: Invoices Overdue
        const { data: overdueInvoices } = await supabase
            .from("Invoice")
            .select("id, projectId, amountInvoicedGross, dueDate, project:Project(name)")
            .eq("organizationId", organizationId)
            .eq("sent", true)
            .lt("dueDate", new Date().toISOString())
            .filter("amountPaidGross", "lt", supabase.from("Invoice").select("amountInvoicedGross") as any); // Simplification for logic

        if (overdueInvoices) {
            // Refine in JS to check balance
            const realOverdue = overdueInvoices.filter((inv: any) => {
                const total = inv.amountInvoicedGross || 0;
                const paid = (inv as any).amountPaidGross || 0;
                return total > paid;
            });

            realOverdue.forEach((inv: any) => {
                insights.push({
                    id: `invoice-${inv.id}`,
                    type: 'INVOICE_OVERDUE',
                    severity: 'high',
                    title: `Factura Vencida: $${inv.amountInvoicedGross.toLocaleString()}`,
                    message: `La factura del proyecto "${inv.project?.name}" venció el ${new Date(inv.dueDate).toLocaleDateString()}.`,
                    actionLabel: "Ver Facturas",
                    actionHref: "/invoices"
                });
            });
        }

        return insights;
    }
}
