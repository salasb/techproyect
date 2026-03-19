import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server-resolver';
import { calculateProjectFinancials } from '@/services/financialCalculator';
import prisma from '@/lib/prisma';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsonToCsv } from '@/lib/exportUtils';
import { resolveEntitlements } from '@/lib/billing/entitlements';
import { getWorkspaceState } from '@/lib/auth/workspace-resolver';

export async function GET(request: Request) {
    try {
        const workspace = await getWorkspaceState();
        const entitlements = resolveEntitlements(workspace);
        
        if (!entitlements.canExportProjects) {
            return NextResponse.json({ error: "Exportación no habilitada para esta organización" }, { status: 403 });
        }
        
        const scope = await requirePermission('PROJECTS_MANAGE');
        if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const formatType = searchParams.get('format') || 'csv';
        const tab = searchParams.get('tab') || 'active';

        const statusFilter = tab === 'active'
            ? { in: ['EN_ESPERA', 'EN_CURSO', 'BLOQUEADO'] }
            : { in: ['CERRADO', 'CANCELADO'] };

        const [projects, settings] = await Promise.all([
            prisma.project.findMany({
                where: {
                    organizationId: scope.orgId,
                    status: statusFilter as any
                },
                include: {
                    company: true,
                    client: true,
                    costEntries: true,
                    invoices: true,
                    quoteItems: true
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.settings.findFirst()
        ]);

        const safeSettings = settings || {
            vatRate: 0.19,
            yellowThresholdDays: 7,
            defaultPaymentTermsDays: 30
        };

        const exportData = projects.map(p => {
            const fin = calculateProjectFinancials(
                p as any,
                (p.costEntries || []) as any,
                (p.invoices || []) as any,
                safeSettings as any,
                (p.quoteItems || []) as any
            );

            const totalCosts = (p.costEntries || []).reduce((acc: any, c: any) => acc + c.amountNet, 0);
            const totalInvoiced = (p.invoices || []).reduce((acc: any, inv: any) => acc + (inv.amountInvoicedGross || 0), 0);
            const totalPaid = (p.invoices || []).reduce((acc: any, inv: any) => acc + (inv.amountPaidGross || 0), 0);

            return {
                "ID": p.id.slice(-8).toUpperCase(),
                "Proyecto": p.name,
                "Cliente": p.client?.name || p.company?.name || 'No asignado',
                "Estado": p.status,
                "Próxima Acción": p.nextAction || 'Ninguna',
                "Fecha Próx Acción": p.nextActionDate ? format(new Date(p.nextActionDate), 'dd/MM/yyyy', { locale: es }) : '',
                "Venta Neta": fin.priceNet,
                "Costo Neto": totalCosts,
                "Margen Bruto": fin.marginAmountNet,
                "Margen %": fin.priceNet > 0 ? ((fin.marginAmountNet / fin.priceNet) * 100).toFixed(1) + '%' : '0%',
                "Facturado Gross": totalInvoiced,
                "Pagado Gross": totalPaid,
                "Responsable": p.responsible || '',
                "Fecha Creación": format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: es }),
            };
        });

        if (formatType === 'csv') {
            const columns = Object.keys(exportData[0] || {}).map(key => ({
                header: key,
                accessor: (item: any) => item[key]
            }));
            const csv = jsonToCsv(exportData, columns);
            return NextResponse.json({ csv, count: exportData.length });
        }

        // Return raw JSON for the client to convert to XLSX using sheetjs (handled in standard downloadXlsx)
        return NextResponse.json({ json: exportData, count: exportData.length });

    } catch (error: any) {
        console.error("[ExportProjects] Error:", error.message);
        return NextResponse.json({ error: "Failed to export projects" }, { status: 500 });
    }
}
