import { QuotePrintButton } from "@/components/projects/QuotePrintButton";
import { QuoteAcceptance } from "@/components/projects/QuoteAcceptance";
import { QuoteActions } from "@/components/projects/QuoteActions";
import { QuoteDocument } from "@/components/projects/QuoteDocument";
import { QuoteVersionSelector } from "@/components/projects/QuoteVersionSelector";
import { ShareDialog } from "@/components/sharing/ShareDialog";
import { calculateProjectFinancials } from "@/services/financialCalculator";
import { Database } from "@/types/supabase";
import { resolveProjectAccess } from "@/lib/auth/project-resolver";
import Link from "next/link";
import { ArrowLeft, Lock, AlertCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

type Settings = Database['public']['Tables']['Settings']['Row']

interface Props {
    params: Promise<{ id: string }>
}

/**
 * QUOTE VIEW PAGE (v2.0)
 * Uses canonical resolveProjectAccess for identifier consistency and security.
 */
export default async function QuotePage({ params, searchParams }: Props & { searchParams: Promise<{ v?: string }> }) {
    const traceId = `QUO-PG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { id } = await params;
    const { v } = await searchParams;

    // 1. Resolve Access & Load Project (Canonical Prisma Flow)
    const access = await resolveProjectAccess(id);

    if (!access.ok) {
        console.warn(`[QuotePage][${traceId}] Access denied or project not found: ${id} (${access.code})`);
        return (
            <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md border border-red-100">
                    <div className="bg-red-50 p-4 rounded-full w-fit mx-auto mb-4 text-red-600">
                        {access.code === 'PROJECT_NOT_FOUND' ? <AlertCircle className="w-10 h-10" /> : <Lock className="w-10 h-10" />}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        {access.code === 'PROJECT_NOT_FOUND' ? 'Proyecto no encontrado' : 'Acceso Restringido'}
                    </h2>
                    <p className="text-slate-600 mb-6">{access.message}</p>
                    <div className="flex gap-3 justify-center">
                        <Button asChild variant="outline">
                            <Link href="/projects">Ir a Proyectos</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/dashboard">Dashboard</Link>
                        </Button>
                    </div>
                    <p className="mt-8 text-[10px] font-mono text-slate-400 uppercase tracking-widest">Trace ID: {access.traceId}</p>
                </div>
            </div>
        );
    }

    const { project } = access;

    // 2. Fetch Version History (Specific entities in Quote table)
    const allQuotes = await prisma.quote.findMany({
        where: { projectId: id },
        include: { items: true },
        orderBy: { version: 'desc' }
    });

    // Determine Selected Content (Snapshot or Live Draft)
    let selectedQuote = allQuotes.length > 0 ? allQuotes[0] : null;
    if (v) {
        const found = allQuotes.find(q => q.id === v);
        if (found) selectedQuote = found;
    }

    // Work with a mutable copy for display adjustments
    const displayProject = { ...project };

    if (selectedQuote) {
        // Override live items with the Snapshot items from SELECTED quote
        displayProject.quoteItems = selectedQuote.items as any;
        displayProject.totalNet = selectedQuote.totalNet;
        (displayProject as any).version = selectedQuote.version;
    }

    // Filter & Sort Items for Display
    if (displayProject.quoteItems) {
        displayProject.quoteItems = displayProject.quoteItems.filter((item: any) => item.isSelected !== false);
        displayProject.quoteItems.sort((a: any, b: any) => (a.sku || '').localeCompare(b.sku || ''));
    }

    // 3. Load Project Settings (Legacy check for vatRate)
    let settings = await prisma.settings.findFirst();
    if (!settings) settings = { vatRate: 0.19 } as any;

    const financials = calculateProjectFinancials(
        displayProject, 
        displayProject.costEntries || [], 
        displayProject.invoices || [], 
        settings as any, 
        displayProject.quoteItems || []
    );

    // 4. Resolve Subscription / Paywall
    const subscription = await prisma.subscription.findUnique({
        where: { organizationId: project.organizationId as string },
        select: { status: true }
    });
    const isPaused = subscription?.status === 'PAUSED' || subscription?.status === 'PAST_DUE';

    return (
        <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 p-8 print:p-0 print:bg-white animate-in fade-in duration-500">
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
                    quote={selectedQuote}
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
                    <Link href={`/projects/${project.id}`} className="bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center h-10">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver
                    </Link>
                    <QuotePrintButton variant="solid" />
                    <ShareDialog entityType="QUOTE" entityId={selectedQuote?.id || ''} />
                </div>
            </div>

            {/* Render Document */}
            <QuoteDocument project={displayProject as any} settings={settings as any} />
        </div>
    )
}
