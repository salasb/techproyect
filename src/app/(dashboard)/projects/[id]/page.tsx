import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { calculateProjectFinancials } from "@/services/financialCalculator";
import ProjectDetailView from "@/components/projects/ProjectDetailView";
import ProjectInventory from "@/components/projects/ProjectInventory";
import { RiskEngine } from "@/services/riskEngine";
import { getDollarRate, getUfRate } from "@/services/currency";
import { resolveProjectAccess } from "@/lib/auth/project-resolver";
import { Lock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const traceId = `PRJ-PG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { id } = await params;
    
    // Define potential error states
    let accessResult;
    try {
        accessResult = await resolveProjectAccess(id);
    } catch (e: any) {
        console.error(`[ProjectPage][${traceId}] Fatal access resolution error:`, e.message);
        accessResult = { ok: false, code: 'DB_ERROR', message: 'Error al verificar acceso.', traceId };
    }

    if (!accessResult.ok) {
        if (accessResult.code === 'PROJECT_NOT_FOUND') {
            notFound();
        }

        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-amber-50 p-6 rounded-full">
                    <Lock className="w-12 h-12 text-amber-600" />
                </div>
                <div className="text-center max-w-md space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900">Acceso restringido</h2>
                    <p className="text-slate-600">{accessResult.message}</p>
                    <p className="text-[10px] font-mono text-slate-400 uppercase mt-4">Trace: {accessResult.traceId}</p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/projects">Volver a Proyectos</Link>
                </Button>
            </div>
        );
    }

    const { project } = accessResult;
    const orgId = project.organizationId;

    // Fetch operational data
    let operationalData;
    let fetchError = null;

    try {
        console.log(`[ProjectPage][${traceId}] Loading data for project=${id}`);
        const [auditLogs, projectLogs, clients, settings, exchangeRate, ufRate] = await Promise.all([
            prisma.auditLog.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
            prisma.projectLog.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' } }),
            prisma.client.findMany({ where: { organizationId: orgId }, orderBy: { name: 'asc' } }),
            prisma.settings.findFirst(),
            getDollarRate().catch(() => ({ value: 855, code: 'USD', date: new Date().toISOString(), source: 'FALLBACK' })),
            getUfRate().catch(() => ({ value: 37000, code: 'UF', date: new Date().toISOString(), source: 'FALLBACK' }))
        ]);

        const safeSettings = settings || {
            organizationId: orgId,
            currency: "CLP",
            vatRate: 0.19,
            defaultPaymentTermsDays: 30,
            yellowThresholdDays: 7
        };

        const financials = calculateProjectFinancials(
            project,
            (project as any).costEntries || [],
            (project as any).invoices || [],
            safeSettings as any,
            (project as any).quoteItems || []
        );

        const risk = RiskEngine.calculateProjectRisk(project as any, safeSettings as any);

        operationalData = {
            auditLogs,
            projectLogs,
            clients,
            safeSettings,
            financials,
            risk,
            exchangeRate,
            ufRate
        };
    } catch (e: any) {
        console.error(`[ProjectPage][${traceId}] Data fetch error:`, e.message);
        fetchError = e.message;
    }

    if (fetchError) {
        return (
            <div className="p-12 text-center bg-rose-50 border-2 border-rose-200 rounded-xl m-8 text-rose-900">
                <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-4" />
                <h3 className="text-lg font-bold uppercase tracking-tight">Error de Infraestructura</h3>
                <p className="max-w-md mx-auto mt-2">No se pudieron cargar los datos del proyecto. Trace: {traceId}</p>
            </div>
        );
    }

    if (!operationalData) return null;

    return (
        <ProjectDetailView
            project={project as any}
            financials={operationalData.financials}
            settings={operationalData.safeSettings as any}
            auditLogs={operationalData.auditLogs as any[]}
            projectLogs={operationalData.projectLogs as any[]}
            clients={operationalData.clients as any[]}
            risk={operationalData.risk}
            exchangeRate={operationalData.exchangeRate}
            ufRate={operationalData.ufRate}
            tasks={(project as any).tasks || []}
            inventoryWidget={<ProjectInventory projectId={id} orgId={orgId} />}
        />
    );
}
