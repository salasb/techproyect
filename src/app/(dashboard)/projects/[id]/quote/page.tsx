import { QuotePrintButton } from "@/components/projects/QuotePrintButton";
import { QuoteAcceptance } from "@/components/projects/QuoteAcceptance";
import { QuoteActions } from "@/components/projects/QuoteActions";
import { QuoteDocument } from "@/components/projects/QuoteDocument";
import { QuoteVersionSelector } from "@/components/projects/QuoteVersionSelector";
import { ShareDialog } from "@/components/sharing/ShareDialog";
import { createClient } from "@/lib/supabase/server";
import { calculateProjectFinancials } from "@/services/financialCalculator";
import { Database } from "@/types/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

type Settings = Database['public']['Tables']['Settings']['Row']

interface Props {
    params: Promise<{ id: string }>
}

export default async function QuotePage({ params, searchParams }: Props & { searchParams: Promise<{ v?: string }> }) {
    const supabase = await createClient();
    const { id } = await params;
    const { v } = await searchParams;

    // Fetch Project with Quote Items
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

    if (!project) return <div>Proyecto no encontrado</div>

    // Fetch ALL Quotes for Version History
    const allQuotes = await prisma.quote.findMany({
        where: { projectId: id },
        include: { items: true },
        orderBy: { version: 'desc' }
    });

    // Determine Selected Quote
    let selectedQuote = allQuotes.length > 0 ? allQuotes[0] : null;
    if (v) {
        const found = allQuotes.find(q => q.id === v);
        if (found) selectedQuote = found;
    }

    if (selectedQuote) {
        // Override items with the Snapshot items from SELECTED quote
        project.quoteItems = selectedQuote.items as any;
        project.totalNet = selectedQuote.totalNet;
        // project.acceptedAt logic is tricky if viewing old version, 
        // but for visual consistency we show the snapshot data.
    }

    // Sort quoteItems by sku (client-side sort since we are using join)
    if (project && project.quoteItems) {
        // FILTER: Keep only selected items for the Quote View
        // If it's a Quote Snapshot, items don't have isSelected? 
        // Schema says QuoteItem HAS isSelected.
        project.quoteItems = project.quoteItems.filter((item: any) => item.isSelected !== false);

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

    // Fetch Subscription Status for Paywall
    const { data: subscription } = await supabase
        .from('Subscription')
        .select('status')
        .eq('organizationId', project.organizationId)
        .maybeSingle();
    const isPaused = subscription?.status === 'PAUSED' || subscription?.status === 'PAST_DUE';

    return (
        <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-8 print:p-0 print:bg-white">
            {/* Toolbar - Hidden when printing */}
            <div className="max-w-[210mm] mx-auto mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
                <QuoteAcceptance
                    projectId={project.id}
                    initialAccepted={!!project.acceptedAt}
                    isPaused={isPaused}
                />
                <QuoteActions
                    projectId={project.id}
                    clientId={project.clientId}
                    projectStatus={project.status}
                    projectName={project.name}
                    quoteSentDate={project.quoteSentDate}
                    isPaused={isPaused}
                />
                <div className="flex gap-2 items-center">
                    <QuoteVersionSelector
                        quotes={allQuotes.map(q => ({
                            id: q.id,
                            version: q.version,
                            status: q.status,
                            createdAt: q.createdAt.toISOString(),
                            totalNet: q.totalNet || 0
                        }))}
                        currentQuoteId={selectedQuote?.id || ''}
                    />
                    <Link href={`/projects/${project.id}`} className="bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center h-10">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver
                    </Link>
                    <QuotePrintButton variant="solid" />
                    <ShareDialog entityType="QUOTE" entityId={selectedQuote?.id || ''} />
                </div>
            </div>

            {/* Render Document */}
            {/* We cast project to any to overlap the loaded relations with the expected type if needed, 
                but Typescript should match mostly. */}
            <QuoteDocument project={project as any} settings={settings} />
        </div>
    )
}
