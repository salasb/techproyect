import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server-resolver';
import { FinancialDomain } from '@/services/financialDomain';
import prisma from '@/lib/prisma';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsonToCsv } from '@/lib/exportUtils';
import { resolveCommercialContext } from '@/lib/billing/commercial-domain';
import { getWorkspaceState } from '@/lib/auth/workspace-resolver';

export async function GET(request: Request) {
    try {
        const workspace = await getWorkspaceState();
        const entitlements = resolveCommercialContext(workspace);
        
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
            // Use safeSettings to avoid null pointer errors in FinancialDomain
            const fin = FinancialDomain.getProjectSnapshot(p as any, safeSettings as any);

            const totalCosts = (p.costEntries || []).reduce((acc: any, c: any) => acc + c.amountNet, 0);
            const totalInvoiced = (p.invoices || []).reduce((acc: any, inv: any) => acc + (inv.amountInvoicedGross || 0), 0);
            const totalPaid = (p.invoices || []).reduce((acc: any, inv: any) => acc + (inv.amountPaidGross || 0), 0);

            // Safe date formatting
            let formattedNextActionDate = '';
            try {
                if (p.nextActionDate) {
                    const d = new Date(p.nextActionDate);
                    if (!isNaN(d.getTime())) {
                        formattedNextActionDate = format(d, 'dd/MM/yyyy', { locale: es });
                    }
                }
            } catch (e) {
                console.error(`Error formatting nextActionDate for project ${p.id}:`, e);
            }

            let formattedCreatedAt = '';
            try {
                const d = new Date(p.createdAt);
                if (!isNaN(d.getTime())) {
                    formattedCreatedAt = format(d, 'dd/MM/yyyy', { locale: es });
                }
            } catch (e) {
                console.error(`Error formatting createdAt for project ${p.id}:`, e);
            }

            return {
                "ID": (p.id || '').slice(-8).toUpperCase(),
                "Proyecto": p.name || 'Sin nombre',
                "Cliente": p.client?.name || p.company?.name || 'No asignado',
                "Estado": p.status,
                "Próxima Acción": p.nextAction || 'Ninguna',
                "Fecha Próx Acción": formattedNextActionDate,
                "Venta Neta": fin.priceNet || 0,
                "Costo Neto": totalCosts || 0,
                "Margen Bruto": fin.marginAmountNet || 0,
                "Margen %": (fin.priceNet && fin.priceNet > 0) ? ((fin.marginAmountNet / fin.priceNet) * 100).toFixed(1) + '%' : '0%',
                "Facturado Gross": totalInvoiced || 0,
                "Pagado Gross": totalPaid || 0,
                "Responsable": p.responsible || '',
                "Fecha Creación": formattedCreatedAt,
            };
        });

        if (formatType === 'csv') {
            // Handle empty data case for columns
            const firstItem = exportData[0] || {
                "ID": "", "Proyecto": "", "Cliente": "", "Estado": "", 
                "Próxima Acción": "", "Fecha Próx Acción": "", "Venta Neta": 0, 
                "Costo Neto": 0, "Margen Bruto": 0, "Margen %": "0%", 
                "Facturado Gross": 0, "Pagado Gross": 0, "Responsable": "", "Fecha Creación": ""
            };
            
            const columns = Object.keys(firstItem).map(key => ({
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
