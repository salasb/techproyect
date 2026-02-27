import { createClient } from "@/lib/supabase/server";
import { Search, Loader2, CheckCircle2, LayoutGrid, List, FileText } from "lucide-react";
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

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ page?: string, q?: string, view?: string }> }) {
    const supabase = await createClient();
    const params = await searchParams;
    const cookieStore = await cookies();

    // Preference: URL Param > Cookie > Default (grid)
    const view = params?.view || cookieStore.get('app-quotes-view')?.value || "grid";

    const page = Number(params?.page) || 1;
    const query = params?.q || "";
    const itemsPerPage = 10;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage - 1;

    // v1.0: Query from Quote model
    let dbQuery = supabase
        .from('Quote')
        .select('*, project:Project(*, client:Client(*), company:Company(*)), quoteItems:QuoteItem(*)', { count: 'exact' })
        .order('createdAt', { ascending: false })
        .range(start, end);

    // If query exists, filter by project name (joined)
    // Note: Supabase JS filter on joined tables can be tricky, using simple ILIKE on Quote for now if we had searchable fields there
    // For now, let's assume we search on project name if possible or just filter by project.name in JS if data set is small
    // Better: let's filter directly on the quote's project relation if the provider supports it or just do basic listing.

    const { data: quotes, count, error } = await dbQuery;

    const totalPages = count ? Math.ceil(count / itemsPerPage) : 0;
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Grouping Logic for List View (Dynamic)
    const groupedQuotes: Record<string, any[]> = {};

    if (quotes) {
        quotes.forEach(q => {
            const status = q.status || 'OTRO';
            if (!groupedQuotes[status]) groupedQuotes[status] = [];
            groupedQuotes[status].push(q);
        });
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Cotizaciones</h2>
                    <p className="text-muted-foreground">Gestión de propuestas comerciales.</p>
                </div>
                <QuoteExportButton query={query} />
            </div>

            {/* View Toggle */}
            <div className="flex justify-end mb-4">
                <QuoteViewToggle currentView={view} />
            </div>

            {/* Content */}
            {!quotes || quotes.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground italic">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No se encontraron cotizaciones.</p>
                </div>
            ) : view === 'list' ? (
                // LIST VIEW (Grouped by Status)
                <div className="space-y-8">
                    {Object.entries(groupedQuotes).map(([status, groupQuotes]) => {
                        if (groupQuotes.length === 0) return null;
                        return (
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
                        )
                    })}
                </div>
            ) : (
                // GRID VIEW
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
                
                {/* Commercial Actions v1.0 */}
                <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" asChild className="rounded-lg h-8 text-[10px] font-black uppercase">
                        <Link href={`/projects/${quote.projectId}/quote`}>Ver Detalle</Link>
                    </Button>
                    {quote.status === 'SENT' && (
                        <AcceptQuoteButton quoteId={quote.id} />
                    )}
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
                <div className="flex items-center gap-2 min-w-[100px] justify-end">
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
