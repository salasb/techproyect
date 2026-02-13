import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateProjectFinancials } from "@/services/financialCalculator";
import ProjectDetailView from "@/components/projects/ProjectDetailView";
import { Database } from "@/types/supabase";
import { RiskEngine } from "@/services/riskEngine";
import { getDollarRate, getUfRate } from "@/services/currency";

type Settings = Database['public']['Tables']['Settings']['Row']

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch project with relations
    const { data: project, error } = await supabase
        .from('Project')
        .select(`
            *,
            company:Company(*),
            client:Client(*),
            costEntries:CostEntry(*),
            invoices:Invoice(*),
            quoteItems:QuoteItem(*),
            SaleNote(*)
        `)
        .eq('id', id)
        .single();

    // Normalizing for frontend compatibility
    if (project && (project as any).SaleNote) {
        const noteData = (project as any).SaleNote;
        // If it's an array, take the first item. If it's an object, take it as is.
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

    if (error || !project) {
        console.error("Error fetching project:", error);
        notFound();
    }

    // Fetch clients for selection
    const { data: clients } = await supabase
        .from('Client')
        .select('*')
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

        settings = newSettings as Settings; // Cast safe here
    }

    // Adapt types for calculation service
    // ensure casting or decoupling
    // The service expects plain Row types for arrays, which we have.
    // project has extras, but compatible.

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

    // 1.5 Fetch Exchange Rates (Server Side)
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
        />
    );
}
