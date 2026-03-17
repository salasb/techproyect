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
    
    try {
        console.log(`[ProjectPage][${traceId}] Resolving access for project=${id}`);
        
        // 1. Resolve Access Canonically (Prisma-based)
        const access = await resolveProjectAccess(id);

        if (!access.ok) {
            if (access.code === 'PROJECT_NOT_FOUND') {
                notFound();
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-amber-50 p-6 rounded-full">
                        <Lock className="w-12 h-12 text-amber-600" />
                    </div>
                    <div className="text-center max-w-md space-y-2">
                        <h2 className="text-2xl font-bold text-slate-900">Acceso restringido</h2>
                        <p className="text-slate-600">{access.message}</p>
                        <p className="text-[10px] font-mono text-slate-400 uppercase mt-4">Trace: {access.traceId}</p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/projects">Volver a Proyectos</Link>
                    </Button>
                </div>
            );
        }

        const { project } = access;
        const orgId = project.organizationId;

        console.log(`[ProjectPage][${traceId}] Loading extended data for project=${id}, org=${orgId}`);

        // 2. Fetch all required data via Prisma in parallel for maximum performance
        const [auditLogs, projectLogs, clients, settings] = await Promise.all([
            prisma.auditLog.findMany({
                where: { projectId: id },
                orderBy: { createdAt: 'desc' },
                take: 20
            }),
            prisma.projectLog.findMany({
                where: { projectId: id },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.client.findMany({
                where: { organizationId: orgId },
                orderBy: { name: 'asc' }
            }),
            prisma.settings.findUnique({
                where: { organizationId: orgId }
            })
        ]);

        // 3. Fallback for Settings (Avoid Calculator crashes)
        const safeSettings = settings || {
            organizationId: orgId,
            currency: "CLP",
            vatRate: 0.19,
            defaultPaymentTermsDays: 30,
            yellowThresholdDays: 7
        };

        // 4. Calculate Business Logic
        const financials = calculateProjectFinancials(
            project,
            (project as any).costEntries || [],
            (project as any).invoices || [],
            safeSettings as any,
            (project as any).quoteItems || []
        );

        const risk = RiskEngine.calculateProjectRisk(project as any, safeSettings as any);

        // 5. External APIs (Parallelized)
        const [exchangeRate, ufRate] = await Promise.all([
            getDollarRate().catch(() => ({ value: 855, code: 'USD', date: new Date().toISOString(), source: 'FALLBACK' })),
            getUfRate().catch(() => ({ value: 37000, code: 'UF', date: new Date().toISOString(), source: 'FALLBACK' }))
        ]);

        return (
            <ProjectDetailView
                project={project as any}
                financials={financials}
                settings={safeSettings as any}
                auditLogs={auditLogs as any[]}
                projectLogs={projectLogs as any[]}
                clients={clients as any[]}
                risk={risk}
                exchangeRate={exchangeRate}
                ufRate={ufRate}
                tasks={(project as any).tasks || []}
                inventoryWidget={<ProjectInventory projectId={id} orgId={orgId} />}
            />
        );

    } catch (error: any) {
        console.error(`[ProjectPage][${traceId}] Critical render exception:`, error.message);
        return (
            <div className="p-12 text-center bg-rose-50 border-2 border-rose-200 rounded-xl m-8 text-rose-900">
                <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-4" />
                <h3 className="text-lg font-bold uppercase tracking-tight">Fallo en Servicios de Proyecto</h3>
                <p className="max-w-md mx-auto mt-2">Hubo un error al procesar los datos financieros del proyecto. Por favor contacta a soporte.</p>
                <div className="mt-4 p-2 bg-white/50 rounded font-mono text-[10px] opacity-60">Trace: {traceId}</div>
            </div>
        );
    }
}
