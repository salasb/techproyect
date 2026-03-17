import { Search, FileText, AlertCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PaginationControl } from "@/components/ui/PaginationControl";
import { QuoteExportButton } from "@/components/quotes/QuoteExportButton";
import { QuoteViewToggle } from "@/components/quotes/QuoteViewToggle";
import { cookies } from "next/headers";
import { AcceptQuoteButton } from "@/components/commercial/AcceptQuoteButton";
import { SendQuoteButton } from "@/components/commercial/SendQuoteButton";
import { QuotePdfButton } from "@/components/quotes/QuotePdfButton";
import { getOrganizationId } from "@/lib/current-org";
import prisma from "@/lib/prisma";

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ page?: string, q?: string, view?: string }> }) {
    const traceId = `QUO-LST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const params = await searchParams;
    const cookieStore = await cookies();
    const orgId = await getOrganizationId();

    if (!orgId) {
        return <div className="p-8 text-center text-muted-foreground italic">Debes seleccionar una organización activa.</div>;
    }

    // Preference: URL Param > Cookie > Default (grid)
    const view = params?.view || cookieStore.get('app-quotes-view')?.value || "grid";

    const page = Number(params?.page) || 1;
    const queryTerm = params?.q || "";
    const itemsPerPage = 12;
    const skip = (page - 1) * itemsPerPage;

    try {
        console.log(`[QuotesList][${traceId}] Loading quotes for org=${orgId}, query="${queryTerm}"`);

        // UNIFIED DOMAIN QUERY: 
        // We fetch projects that have quote items, as they represent the "live" quotes.
        // And we join their last official quote version if it exists.
        const projectsWithQuotes = await prisma.project.findMany({
            where: {
                organizationId: orgId,
                OR: [
                    { name: { contains: queryTerm, mode: 'insensitive' } },
                    { company: { name: { contains: queryTerm, mode: 'insensitive' } } },
                    { client: { name: { contains: queryTerm, mode: 'insensitive' } } }
                ],
                // Only show projects that actually have some commercial intent (items or sent date)
                OR: [
                    { quoteItems: { some: {} } },
                    { quoteSentDate: { not: null } }
                ]
            },
            include: {
                company: true,
                client: true,
                quotes: {
                    orderBy: { version: 'desc' },
                    take: 1
                },
                _count: {
                    select: { quoteItems: true }
                }
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: itemsPerPage
        });

        const count = await prisma.project.count({
            where: {
                organizationId: orgId,
                OR: [
                    { quoteItems: { some: {} } },
                    { quoteSentDate: { not: null } }
                ]
            }
        });

        const totalPages = Math.ceil(count / itemsPerPage);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // Map unified data structure for display
        const quotes = projectsWithQuotes.map(p => {
            const lastQuote = p.quotes[0];
            return {
                id: lastQuote?.id || `draft-${p.id}`,
                projectId: p.id,
                project: p,
                status: lastQuote?.status || (p.quoteSentDate ? 'SENT' : 'DRAFT'),
                version: lastQuote?.version || 0,
                totalNet: lastQuote?.totalNet || p.budgetNet,
                createdAt: lastQuote?.createdAt || p.createdAt,
                isDraft: !lastQuote
            };
        });

        // Grouping for List View
        const groupedQuotes: Record<string, any[]> = {};
        quotes.forEach(q => {
            const status = q.status || 'OTRO';
            if (!groupedQuotes[status]) groupedQuotes[status] = [];
            groupedQuotes[status].push(q);
        });

        return (
            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Cotizaciones</h2>
                        <p className="text-muted-foreground">Gestión de propuestas comerciales activas y enviadas.</p>
                    </div>
                    <QuoteExportButton query={queryTerm} />
                </div>

                <div className="flex justify-end mb-4">
                    <QuoteViewToggle currentView={view} />
                </div>

                {quotes.length === 0 ? (
                    <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground italic">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No se encontraron cotizaciones activas.</p>
                        <p className="text-xs mt-2">Crea un proyecto y agrega ítems para ver propuestas aquí.</p>
                    </div>
                ) : view === 'list' ? (
                    <div className="space-y-8">
                        {Object.entries(groupedQuotes).map(([status, groupQuotes]) => (
                            <section key={status} className="space-y-3">
                                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                    <StatusBadge status={status} type="QUOTE" />
                                    <span className="text-sm text-muted-foreground font-medium">({groupQuotes.length})</span>
                                </div>
                                <div className="space-y-2">
                                    {groupQuotes.map((quote) => (
                                        <QuoteListItem key={quote.id} quote={quote} />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quotes.map((quote) => (
                            <QuoteGridCard key={quote.id} quote={quote} />
                        ))}
                    </div>
                )}

                <PaginationControl
                    currentPage={page}
                    totalPages={totalPages}
                    hasNextPage={hasNextPage}
                    hasPrevPage={hasPrevPage}
                />
            </div>
        );
    } catch (error: any) {
        console.error(`[Quotes][${traceId}] Critical error:`, error.message);
        return (
            <div className="p-12 text-center bg-rose-50 border-2 border-rose-200 rounded-xl m-8 text-rose-900">
                <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-4" />
                <h3 className="text-lg font-bold uppercase tracking-tight">Error de Consistencia de Dominio</h3>
                <p className="max-w-md mx-auto mt-2">No se pudo alinear el listado de cotizaciones con los proyectos activos.</p>
                <div className="mt-4 p-2 bg-white/50 rounded font-mono text-[10px] opacity-60">Trace: {traceId}</div>
            </div>
        );
    }
}

function calculateQuoteTotals(quote: any) {
    const totalValue = quote.totalNet || 0;
    const currency = quote.project?.currency || 'CLP';
    
    const formattedTotal = currency === 'CLP'
        ? `CLP $${totalValue.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
        : currency === 'USD'
            ? `USD $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `UF ${totalValue.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return { totalValue, formattedTotal };
}

function QuoteGridCard({ quote }: { quote: any }) {
    const { formattedTotal } = calculateQuoteTotals(quote);

    return (
        <div className="group bg-card hover:bg-slate-50 dark:hover:bg-slate-900 border border-border hover:border-blue-200 dark:hover:border-blue-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full">
            <Link href={`/projects/${quote.projectId}/quote`} className="flex-1">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            {quote.isDraft ? (
                                <Badge variant="outline" className="text-[8px] font-bold bg-amber-50 text-amber-700 border-amber-200 uppercase">Borrador</Badge>
                            ) : (
                                <Badge variant="outline" className="text-[8px] font-bold bg-blue-50 text-blue-700 border-blue-200">v{quote.version}</Badge>
                            )}
                            <h3 className="font-bold text-lg text-foreground group-hover:text-blue-600 transition-colors line-clamp-1" title={quote.project?.name}>
                                {quote.project?.name}
                            </h3>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                            {quote.project?.client?.name || quote.project?.company?.name || 'Cliente sin asignar'}
                        </p>
                    </div>
                    <StatusBadge status={quote.status} type="QUOTE" />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    <span className="bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                        {quote.createdAt ? format(new Date(quote.createdAt), 'dd MMM yyyy', { locale: es }) : '-'}
                    </span>
                </div>
            </Link>

            <div className="border-t border-border pt-4 mt-auto">
                <div className="flex justify-between items-end mb-4">
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Valor Estimado</div>
                    <div className="font-mono font-bold text-xl text-foreground">
                        {formattedTotal}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild className="rounded-lg h-8 text-[10px] font-black uppercase flex-1">
                        <Link href={`/projects/${quote.projectId}/quote`}>Ver Cotización</Link>
                    </Button>
                    {!quote.isDraft && (
                        <div className="flex items-center gap-1">
                            <QuotePdfButton quote={quote} />
                            {quote.status === 'SENT' && (
                                <AcceptQuoteButton quoteId={quote.id} />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function QuoteListItem({ quote }: { quote: any }) {
    const { formattedTotal } = calculateQuoteTotals(quote);

    return (
        <div className="group flex items-center justify-between bg-card hover:bg-slate-50 dark:hover:bg-slate-900/50 border border-border hover:border-blue-200 dark:hover:border-blue-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
            <Link href={`/projects/${quote.projectId}/quote`} className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-3 mb-1">
                    {quote.isDraft ? (
                        <Badge variant="outline" className="text-[8px] font-bold bg-amber-50 text-amber-700 border-amber-200 uppercase">Borrador</Badge>
                    ) : (
                        <Badge variant="outline" className="text-[8px] font-bold bg-blue-50 text-blue-700 border-blue-200">v{quote.version}</Badge>
                    )}
                    <h3 className="font-bold text-base text-foreground group-hover:text-blue-600 transition-colors truncate">
                        {quote.project?.name}
                    </h3>
                    <span className="shrink-0 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {quote.createdAt ? format(new Date(quote.createdAt), 'dd MMM', { locale: es }) : '-'}
                    </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                    {quote.project?.client?.name || quote.project?.company?.name || 'Cliente sin asignar'}
                </p>
            </Link>

            <div className="flex items-center gap-6 shrink-0">
                <div className="text-right">
                    <div className="font-mono font-bold text-base text-foreground">
                        {formattedTotal}
                    </div>
                </div>
                <StatusBadge status={quote.status} type="QUOTE" />
                <div className="flex items-center gap-2 min-w-[140px] justify-end">
                    {!quote.isDraft && <QuotePdfButton quote={quote} />}
                    <Button variant="ghost" size="sm" asChild className="rounded-lg h-8 w-8 p-0">
                        <Link href={`/projects/${quote.projectId}/quote`}><Search className="w-4 h-4" /></Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Helper Components & Functions
function calculateQuoteTotals(quote: any) {
    const totalValue = quote.totalNet || 0;
    const currency = quote.project?.currency || 'CLP';
    
    const formattedTotal = currency === 'CLP'
        ? `CLP $${totalValue.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
        : currency === 'USD'
            ? `USD $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `UF ${totalValue.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return { totalValue, formattedTotal };
}

function QuoteGridCard({ quote }: { quote: any }) {
    const { formattedTotal } = calculateQuoteTotals(quote);

    return (
        <div
            className="group bg-card hover:bg-slate-50 dark:hover:bg-slate-900 border border-border hover:border-blue-200 dark:hover:border-blue-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full"
        >
            <Link href={`/projects/${quote.projectId}/quote`} className="flex-1">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[8px] font-bold">v{quote.version}</Badge>
                            <h3 className="font-bold text-lg text-foreground group-hover:text-blue-600 transition-colors line-clamp-1" title={quote.project?.name}>
                                {quote.project?.name}
                            </h3>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                            {quote.project?.client?.name || quote.project?.company?.name || 'Cliente sin asignar'}
                        </p>
                    </div>
                    <StatusBadge status={quote.status} type="QUOTE" />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    <span className="bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                        {quote.createdAt ? format(new Date(quote.createdAt), 'dd MMM yyyy', { locale: es }) : '-'}
                    </span>
                    {quote.status === 'SENT' && (
                        <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-bold">
                            Enviada
                        </span>
                    )}
                </div>
            </Link>

            <div className="border-t border-border pt-4 mt-auto">
                <div className="flex justify-between items-end mb-4">
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Valor Total</div>
                    <div className="font-mono font-bold text-xl text-foreground">
                        {formattedTotal}
                    </div>
                </div>
                
                {/* Commercial Actions v1.1 */}
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild className="rounded-lg h-8 text-[10px] font-black uppercase flex-1">
                        <Link href={`/projects/${quote.projectId}/quote`}>Ver Detalle</Link>
                    </Button>
                    <div className="flex items-center gap-1">
                        <QuotePdfButton quote={quote} />
                        {quote.status === 'DRAFT' && (
                            <SendQuoteButton quoteId={quote.id} />
                        )}
                        {quote.status === 'SENT' && (
                            <AcceptQuoteButton quoteId={quote.id} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function QuoteListItem({ quote }: { quote: any }) {
    const { formattedTotal } = calculateQuoteTotals(quote);

    return (
        <div
            className="group flex items-center justify-between bg-card hover:bg-slate-50 dark:hover:bg-slate-900/50 border border-border hover:border-blue-200 dark:hover:border-blue-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200"
        >
            <Link href={`/projects/${quote.projectId}/quote`} className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-3 mb-1">
                    <Badge variant="outline" className="text-[8px] font-bold">v{quote.version}</Badge>
                    <h3 className="font-bold text-base text-foreground group-hover:text-blue-600 transition-colors truncate">
                        {quote.project?.name}
                    </h3>
                    <span className="shrink-0 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {quote.createdAt ? format(new Date(quote.createdAt), 'dd MMM', { locale: es }) : '-'}
                    </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                    {quote.project?.client?.name || quote.project?.company?.name || 'Cliente sin asignar'}
                </p>
            </Link>

            <div className="flex items-center gap-6 shrink-0">
                <div className="text-right">
                    <div className="font-mono font-bold text-base text-foreground">
                        {formattedTotal}
                    </div>
                </div>
                <StatusBadge status={quote.status} type="QUOTE" />
                <div className="flex items-center gap-2 min-w-[140px] justify-end">
                    <QuotePdfButton quote={quote} />
                    {quote.status === 'DRAFT' && (
                        <SendQuoteButton quoteId={quote.id} />
                    )}
                    {quote.status === 'SENT' && (
                        <AcceptQuoteButton quoteId={quote.id} />
                    )}
                    <Button variant="ghost" size="sm" asChild className="rounded-lg h-8 w-8 p-0">
                        <Link href={`/projects/${quote.projectId}/quote`}><Search className="w-4 h-4" /></Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
