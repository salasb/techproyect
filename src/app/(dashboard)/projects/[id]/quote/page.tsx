import { QuotePrintButton } from "@/components/projects/QuotePrintButton";
import { QuoteAcceptance } from "@/components/projects/QuoteAcceptance";
import { QuoteDocument } from "@/components/projects/QuoteDocument";
import { createClient } from "@/lib/supabase/server";
import { calculateProjectFinancials } from "@/services/financialCalculator";
import { Database } from "@/types/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";

export const dynamic = 'force-dynamic';

type Settings = Database['public']['Tables']['Settings']['Row']

interface Props {
    params: Promise<{ id: string }>
}

export default async function QuotePage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch Project Project with Quote Items included
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

    // Sort quoteItems by sku (client-side sort since we are using join)
    if (project && project.quoteItems) {
        project.quoteItems.sort((a: any, b: any) => {
            if (a.sku && b.sku) return a.sku.localeCompare(b.sku);
            return 0;
        });
    }

    // Fetch Settings
    let { data: settings } = await supabase.from('Settings').select('*').single();
    if (!settings) settings = { vatRate: 0.19 } as Settings;


    if (!project) return <div>Proyecto no encontrado</div>

    const financials = calculateProjectFinancials(project, project.costEntries || [], project.invoices || [], settings, project.quoteItems || []);

    return (
        <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-8 print:p-0 print:bg-white">
            {/* Toolbar - Hidden when printing */}
            <div className="max-w-[210mm] mx-auto mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
                <QuoteAcceptance projectId={project.id} initialAccepted={!!project.acceptedAt} />
                <QuotePrintButton variant="solid" />
            </div>

            {/* Render Document */}
            {/* We cast project to any to overlap the loaded relations with the expected type if needed, 
                but Typescript should match mostly. */}
            <QuoteDocument project={project as any} settings={settings} />
        </div>
    )
}
