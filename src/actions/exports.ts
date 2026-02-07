'use server'

import { createClient } from "@/lib/supabase/server";
import { calculateProjectFinancials } from "@/services/financialCalculator";
import { DEFAULT_VAT_RATE } from "@/lib/constants";

export async function getQuotesForExport(query: string = "") {
    const supabase = await createClient();

    let dbQuery = supabase
        .from('Project')
        .select(`
            id,
            name,
            createdAt,
            status,
            currency,
            client:Client(name),
            company:Company(name),
            quoteItems:QuoteItem(priceNet, quantity)
        `)
        .order('createdAt', { ascending: false });

    if (query) {
        dbQuery = dbQuery.ilike('name', `%${query}%`);
    }

    const { data, error } = await dbQuery;
    if (error) throw new Error(error.message);

    // Transform for CSV
    return data.map(project => {
        const client = project.client as any;
        const company = project.company as any;
        const clientName = client?.name || company?.name || 'N/A';

        const quoteItems = (project.quoteItems as any[]) || [];
        const totalValue = quoteItems.reduce((acc: number, item: any) => acc + (item.priceNet * item.quantity), 0) || 0;

        return {
            ID: project.id,
            Proyecto: project.name,
            Cliente: clientName,
            Fecha: project.createdAt ? new Date(project.createdAt).toLocaleDateString('es-CL') : '',
            Estado: project.status,
            Moneda: project.currency || 'CLP',
            Valor_Total: totalValue
        };
    });
}

export async function getFinancialReport(period: string = '30d') {
    const supabase = await createClient();

    // Fetch settings for VAT
    const { data: settingsData } = await supabase.from('Settings').select('*').single();
    const settings = settingsData || { vatRate: DEFAULT_VAT_RATE } as any;

    // Fetch Projects with full details for calculation
    const { data: projectsData, error } = await supabase
        .from('Project')
        .select(`
            *,
            company:Company(*),
            client:Client(*),
            costEntries:CostEntry(*),
            invoices:Invoice(*),
            quoteItems:QuoteItem(*)
        `)
        .order('updatedAt', { ascending: false });

    if (error) throw new Error(error.message);
    const projects = projectsData || [];

    // Transform for CSV
    return projects.map(p => {
        const financials = calculateProjectFinancials(p, p.costEntries || [], p.invoices || [], settings, p.quoteItems || []);

        const clientName = (p.client as any)?.name || (p.company as any)?.name || 'N/A';

        return {
            ID: p.id,
            Proyecto: p.name,
            Cliente: clientName,
            Estado: p.status,
            Etapa: p.stage,
            Presupuesto_Neto: financials.priceNet,
            Costos_Reales: financials.totalExecutedCostNet,
            Margen_Neto: financials.marginAmountNet,
            Margen_Pct: (financials.marginPct * 100).toFixed(1) + '%',
            Facturado: financials.totalInvoicedGross,
            Cobrado: financials.totalPaidGross,
            Por_Cobrar: financials.receivableGross // Gross usually relevant for cashflow
        };
    });
}
