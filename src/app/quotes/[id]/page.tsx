import { QuoteDocument } from "@/components/projects/QuoteDocument";
import { QuoteActions } from "@/components/quotes/QuoteActions";
import { AutoPrint } from "@/components/common/AutoPrint";
import { createClient } from "@/lib/supabase/server";
import { calculateProjectFinancials } from "@/services/financialCalculator";
import { Database } from "@/types/supabase";
import { notFound } from "next/navigation";

type Settings = Database['public']['Tables']['Settings']['Row'];

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch Settings
    let { data: settings } = await supabase.from('Settings').select('*').single();
    if (!settings) settings = { vatRate: 0.19 } as Settings;

    // 2. Fetch Project
    const { data: project } = await supabase
        .from('Project')
        .select(`
            *,
            company:Company(*),
            client:Client(*),
            costEntries:CostEntry(*),
            invoices:Invoice(*),
            quoteItems:QuoteItem(*)
        `)
        .eq('id', id)
        .single();

    if (!project) return notFound();

    // 3. Sort Items
    if (project.quoteItems) {
        project.quoteItems.sort((a, b) => (a.sku || '').localeCompare(b.sku || ''));
    }

    // 4. Client/Company resolution for Actions
    const clientName = project.client?.contactName || project.company?.contactName || project.company?.name || 'Cliente';
    const clientEmail = project.client?.email || project.company?.email || '';

    // Cast to any to satisfy QuoteDocument's loose type if necessary, usually it matches.
    const projectWithClient = { ...project, client: project.client || null };

    return (
        <div className="bg-white min-h-screen text-slate-800 p-8 md:p-12 print:p-0 font-sans">

            {/* Render Shared Layout */}
            <QuoteDocument project={projectWithClient} settings={settings} />

            {/* Actions Buttons (Screen only) */}
            <QuoteActions
                quoteId={project.id.slice(0, 8).toUpperCase()}
                projectName={project.name}
                clientName={clientName}
                clientEmail={clientEmail}
            />

            <AutoPrint />
        </div>
    );
}
