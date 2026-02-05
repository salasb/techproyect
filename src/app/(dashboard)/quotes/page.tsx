'use client';

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { FileText, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        async function loadQuotes() {
            const supabase = createClient();
            // We consider a project "in quoting phase" if status is DRAFT (Borrador) or similar, 
            // but for this view we might want to list ALL projects that have a quote?
            // For now, let's list projects that are potentially quotes.
            // Adjust filter as per business logic.
            const { data, error } = await supabase
                .from('Project')
                .select('*')
                .order('createdAt', { ascending: false });

            if (data) setQuotes(data);
            setIsLoading(false);
        }
        loadQuotes();
    }, []);

    const filtered = quotes.filter(q =>
        q.name.toLowerCase().includes(search.toLowerCase()) ||
        q.clientName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Cotizaciones</h2>
                    <p className="text-muted-foreground">Gestión de propuestas comerciales.</p>
                </div>
                {/* <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">
                    Nueva Cotización
                </button> */}
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border flex gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                        <input
                            placeholder="Buscar cotización..."
                            className="pl-9 w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
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
                                <th className="px-6 py-3 text-right">Monto Neto</th>
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
                                filtered.map((quote) => (
                                    <tr key={quote.id} className="hover:bg-muted/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-foreground">{quote.name}</div>
                                            <div className="text-xs text-muted-foreground">{quote.clientName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {quote.createdAt ? format(new Date(quote.createdAt), 'dd MMM yyyy', { locale: es }) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                                ${quote.status === 'EN CURSO' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900' :
                                                    quote.status === 'CANCELADO' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900' :
                                                        'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'}
                                            `}>
                                                {quote.status || 'Borrador'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-foreground">
                                            {/* We don't have the calculated total easily here without joining QuoteItems. 
                                                Ideally we'd fetch this or store it on Project. 
                                                For now showing Budget or empty. */}
                                            ${quote.budgetNet?.toLocaleString() || '0'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/projects/${quote.id}`}
                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-xs"
                                            >
                                                Ver Detalle
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
