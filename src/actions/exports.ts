'use server'

import { createClient } from "@/lib/supabase/server";
import { calculateProjectFinancials } from "@/services/financialCalculator";
import { COMMERCIAL_CONFIG } from "@/config/commercial";
import { requireOperationalScope, requirePermission } from "@/lib/auth/server-resolver";
import prisma from "@/lib/prisma";

export async function getQuotesForExport(query: string = "") {
    const scope = await requirePermission('QUOTES_MANAGE');
    const supabase = await createClient();

    let dbQuery = supabase
        .from('Project')
        .select(`
            id,
            name,
            createdAt,
            quoteSentDate,
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
            Fecha_Creacion: project.createdAt ? new Date(project.createdAt).toLocaleDateString('es-CL') : '',
            Fecha_Envio: project.quoteSentDate ? new Date(project.quoteSentDate).toLocaleDateString('es-CL') : 'No Enviada',
            Estado: project.status,
            Moneda: project.currency || 'CLP',
            Valor_Total: totalValue
        };
    });
}

export async function getFinancialReport(period: string = '30d') {
    const scope = await requirePermission('FINANCE_VIEW');
    const supabase = await createClient();

    // Fetch settings for VAT
    const { data: settingsData } = await supabase.from('Settings').select('*').single();
    const settings = settingsData || { vatRate: COMMERCIAL_CONFIG.DEFAULT_VAT_RATE } as any;

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

// v1.0 Integrations Exports
export type ExportType = 'quotes' | 'invoices' | 'payments' | 'tickets';
export type ExportFormat = 'json' | 'csv';

export async function exportDataAction(type: ExportType, format: ExportFormat) {
    const scope = await requirePermission('FINANCE_VIEW');
    const orgId = scope.orgId;

    let data: any[] = [];

    switch (type) {
        case 'quotes':
            data = await prisma.quote.findMany({
                where: { project: { organizationId: orgId } },
                include: { project: { select: { name: true } } },
                orderBy: { createdAt: 'desc' }
            });
            break;
        case 'invoices':
            data = await prisma.invoice.findMany({
                where: { organizationId: orgId },
                include: { project: { select: { name: true } } },
                orderBy: { createdAt: 'desc' }
            });
            break;
        case 'payments':
            data = await prisma.paymentRecord.findMany({
                where: { organizationId: orgId },
                orderBy: { recordedAt: 'desc' }
            });
            break;
        case 'tickets':
            data = await prisma.supportTicket.findMany({
                where: { organizationId: orgId },
                orderBy: { createdAt: 'desc' }
            });
            break;
    }

    if (format === 'json') {
        return { 
            success: true, 
            filename: `${type}_${orgId}_${Date.now()}.json`,
            content: JSON.stringify(data, null, 2),
            contentType: 'application/json'
        };
    }

    // Basic CSV Conversion
    if (format === 'csv') {
        if (data.length === 0) return { success: true, content: '', filename: `${type}.csv` };
        
        const headers = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
        const rows = data.map(item => 
            headers.map(header => {
                const val = item[header];
                return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
            }).join(',')
        );
        
        const csvContent = [headers.join(','), ...rows].join('\n');
        
        return { 
            success: true, 
            filename: `${type}_${orgId}_${Date.now()}.csv`,
            content: csvContent,
            contentType: 'text/csv'
        };
    }

    throw new Error("Formato no soportado");
}
