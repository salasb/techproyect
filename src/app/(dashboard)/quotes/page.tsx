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

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border flex gap-4">
                    <form className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                        <input
                            name="q"
                            defaultValue={query}
                            placeholder="Buscar cotización..."
                            className="pl-9 w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </form>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                            <tr>
                                <th className="px-6 py-3">Proyecto / Cliente</th>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3">Estado</th>
                                <th className="px-6 py-3 text-right">Valor Total</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {!quotes || quotes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        No se encontraron cotizaciones.
                                    </td>
                                </tr>
                            ) : (
                                quotes.map((quote) => {
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
                                        <tr key={quote.id} className="hover:bg-muted/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-foreground">{quote.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {quote.client?.name || quote.company?.name || 'Cliente sin asignar'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span>{quote.createdAt ? format(new Date(quote.createdAt), 'dd MMM yyyy', { locale: es }) : '-'}</span>
                                                    {quote.quoteSentDate && (
                                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full w-fit flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Enviada: {format(new Date(quote.quoteSentDate), 'dd MMM', { locale: es })}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={quote.status} type="QUOTE" />
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-medium text-foreground whitespace-nowrap">
                                                {formattedTotal}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/projects/${quote.id}/quote`}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-xs hover:underline"
                                                >
                                                    Ver Detalle
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <PaginationControl
                currentPage={page}
                totalPages={totalPages}
                hasNextPage={hasNextPage}
                hasPrevPage={hasPrevPage}
            />
        </div>
    );
}
