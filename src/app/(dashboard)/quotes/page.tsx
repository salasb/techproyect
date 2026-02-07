'use client';

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

// Helper to determine status color and label
function getStatusBadge(status: string) {
    const s = status?.toUpperCase() || 'BORRADOR';

    switch (s) {
        case 'EN_CURSO':
        case 'EN CURSO':
            return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800 whitespace-nowrap">En Curso</Badge>;
        case 'EN_ESPERA':
        case 'EN ESPERA':
            return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 whitespace-nowrap">En Espera</Badge>;
        case 'BLOQUEADO':
            return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 whitespace-nowrap">Bloqueado</Badge>;
        case 'FINALIZADO':
        case 'CERRADO':
        case 'COMPLETADO':
            return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800 whitespace-nowrap">Finalizado</Badge>;
        case 'BORRADOR':
        default:
            return <Badge variant="secondary" className="text-zinc-500 whitespace-nowrap">Borrador</Badge>;
    }
}

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        async function loadQuotes() {
            const supabase = createClient();
            // Fetch projects with their quote items to calculate real total
            const { data, error } = await supabase
                .from('Project')
                .select('*, quoteItems:QuoteItem(*)')
                .order('createdAt', { ascending: false });

            if (data) setQuotes(data);
            setIsLoading(false);
        }
        loadQuotes();
    }, []);

    const filtered = quotes.filter(q =>
        q.name.toLowerCase().includes(search.toLowerCase()) ||
        q.clientName?.toLowerCase().includes(search.toLowerCase()) ||
        (q.company?.name || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Cotizaciones</h2>
                    <p className="text-muted-foreground">Gestión de propuestas comerciales.</p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border flex gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                        <input
                            placeholder="Buscar cotización..."
                            className="pl-9 w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
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
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Cargando cotizaciones...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        No se encontraron cotizaciones.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((quote) => {
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
                                                    {quote.clientName || quote.company?.name || 'Cliente sin asignar'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {quote.createdAt ? format(new Date(quote.createdAt), 'dd MMM yyyy', { locale: es }) : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(quote.status)}
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
        </div>
    );
}
