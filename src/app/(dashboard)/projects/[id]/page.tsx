import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateProjectFinancials } from "@/services/financialCalculator";
import ProjectDetailView from "@/components/projects/ProjectDetailView";
import ProjectInventory from "@/components/projects/ProjectInventory";
import { Database } from "@/types/supabase";
import { RiskEngine } from "@/services/riskEngine";
import { getDollarRate, getUfRate } from "@/services/currency";
import { resolveProjectAccess } from "@/lib/auth/project-resolver";
import { AlertCircle, Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Settings = Database['public']['Tables']['Settings']['Row']

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    // 1. Resolve Access Canonically (Precedence: Identity > Cookie)
    const access = await resolveProjectAccess(id);

    if (!access.ok) {
        if (access.code === 'PROJECT_NOT_FOUND') {
            notFound();
        }

        // Handle access denial with a friendly UI instead of just crashing/404
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
    const supabase = await createClient();

    // Fetch associated data using Supabase (Relying on the verified project ID and Org ownership)
    // Note: We already have most data from resolveProjectAccess include, but we normalize here.

    // Normalizing SaleNote for frontend compatibility
    if (project && (project as any).SaleNote) {
        const noteData = (project as any).SaleNote;
        (project as any).saleNote = Array.isArray(noteData) ? noteData[0] : noteData;
    }

    // Fetch audit logs
    const { data: auditLogs } = await supabase
        .from('AuditLog')
        .select('*')
        .eq('projectId', id)
        .order('createdAt', { ascending: false })
        .limit(20);

    // Fetch project logs (Bitácora)
    const { data: projectLogs } = await supabase
        .from('ProjectLog')
        .select('*')
        .eq('projectId', id)
        .order('createdAt', { ascending: false });

    // Fetch clients for selection (Contextual to the project's org)
    const { data: clients } = await supabase
        .from('Client')
        .select('*')
        .eq('organizationId', project.organizationId)
        .order('name');

    // Fetch or create default settings
    let { data: settings } = await supabase
        .from('Settings')
        .select('*')
        .single();

    if (!settings) {
        const { data: newSettings } = await supabase
            .from('Settings')
            .insert({
                currency: "CLP",
                vatRate: 0.19,
                defaultPaymentTermsDays: 30,
                yellowThresholdDays: 7
            })
            .select()
            .single();

        settings = newSettings as Settings;
    }

    // Calculate financials
    const financials = calculateProjectFinancials(
        project,
        project.costEntries || [],
        project.invoices || [],
        settings!,
        project.quoteItems || []
    );

    // Calculate Risk
    const risk = RiskEngine.calculateProjectRisk(project as any, settings!);

    // Fetch Exchange Rates
    const [exchangeRate, ufRate] = await Promise.all([
        getDollarRate(),
        getUfRate()
    ]);

    return (
        <ProjectDetailView
            project={project}
            financials={financials}
            settings={settings}
            auditLogs={auditLogs || []}
            projectLogs={projectLogs || []}
            clients={clients || []}
            risk={risk}
            exchangeRate={exchangeRate}
            ufRate={ufRate}
            tasks={project.tasks || []}
            inventoryWidget={<ProjectInventory projectId={id} orgId={project.organizationId} />}
        />
    );
}
