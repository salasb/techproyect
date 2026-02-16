import { createClient } from "@/lib/supabase/server";
import { Search, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PaginationControl } from "@/components/ui/PaginationControl";
import { QuoteExportButton } from "@/components/quotes/QuoteExportButton";

export default async function QuotesPage({ searchParams }: { searchParams: { page?: string, q?: string } }) {
    const supabase = await createClient();
    const page = Number(searchParams?.page) || 1;
    const query = searchParams?.q || "";
    const itemsPerPage = 10;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage - 1;

    // Build query
    let dbQuery = supabase
        .from('Project')
        .select('*, quoteItems:QuoteItem(*), company:Company(*), client:Client(*)', { count: 'exact' })
        .order('createdAt', { ascending: false })
        .range(start, end);

    if (query) {
        dbQuery = dbQuery.ilike('name', `%${query}%`);
    }

    const { data: quotes, count, error } = await dbQuery;

    const totalPages = count ? Math.ceil(count / itemsPerPage) : 0;
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Cotizaciones</h2>
                    <p className="text-muted-foreground">Gestión de propuestas comerciales.</p>
                </div>
                <QuoteExportButton query={query} />
            </div>

            {/* Quotes Grid */}
            {!quotes || quotes.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                    <p>No se encontraron cotizaciones.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quotes.map((quote) => {
                        // Calculate Total Value dynamically
                        const totalValue = quote.quoteItems?.reduce((acc: number, item: any) => {
                            return acc + (item.priceNet * item.quantity);
                        }, 0) || 0;

                        // Determine Currency
                        const currency = quote.currency || 'CLP';
                        const formattedTotal = currency === 'CLP'
                            ? `CLP $${totalValue.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
                            : currency === 'USD'
                                ? `USD $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : `UF ${totalValue.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                        return (
                            <Link
                                key={quote.id}
                                href={`/projects/${quote.id}/quote`}
                                className="group bg-card hover:bg-slate-50 dark:hover:bg-slate-900 border border-border hover:border-blue-200 dark:hover:border-blue-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg text-foreground group-hover:text-blue-600 transition-colors line-clamp-1" title={quote.name}>
                                                {quote.name}
                                            </h3>
                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                {quote.client?.name || quote.company?.name || 'Cliente sin asignar'}
                                            </p>
                                        </div>
                                        <StatusBadge status={quote.status} type="QUOTE" />
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                            {quote.createdAt ? format(new Date(quote.createdAt), 'dd MMM yyyy', { locale: es }) : '-'}
                                        </span>
                                        {quote.quoteSentDate && (
                                            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Enviada
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-border pt-4 flex justify-between items-end">
                                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Valor Total</div>
                                    <div className="font-mono font-bold text-xl text-foreground">
                                        {formattedTotal}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
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
