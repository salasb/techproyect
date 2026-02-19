"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    CheckCircle2, XCircle, AlertCircle, Clock,
    RefreshCw, Eye
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface StripeEvent {
    id: string;
    type: string;
    status: string;
    created_at: string; // Supabase returns snake_case by default or camelCase depending on config? typically snake_case for raw queries or if types generated. Prisma maps to camelCase. Client uses Supabase Client?
    // Wait, client component using supabase-js client directly means DB types.
    // Prisma schema mapping: createdAt -> created_at in DB?
    // Prisma default is usually camelCase fields mapping to DB columns.
    // Let's assume standard supabase client returns DB column names.
    // Prisma model: createdAt. DB likely "createdAt" if no @map.
    // However, Supabase JS client returns whatever is in DB.
    // Let's check standard Prisma -> Postgres mapping. Usually it preserves case if quoted, otherwise lowercase in PG.
    // Safest is to log or Assume 'createdAt' or 'created_at'.
    // Let's use 'createdAt' matching Prisma model, but if it fails we fix.
    createdAt: string;
    processedAt: string | null;
    durationMs: number | null;
    error: string | null;
    orgId: string | null;
    data: any;
}

export default function WebhooksDashboard() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [searchId, setSearchId] = useState("");

    const fetchEvents = async () => {
        setLoading(true);
        const supabase = createClient();

        let query = supabase
            .from('StripeEvent')
            .select('*')
            .order('createdAt', { ascending: false })
            .limit(50);

        if (filterStatus !== "ALL") {
            query = query.eq('status', filterStatus);
        }

        if (searchId) {
            query = query.ilike('id', `%${searchId}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching events:", error);
        } else {
            setEvents(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchEvents();
        const interval = setInterval(fetchEvents, 30000); // Auto-refresh
        return () => clearInterval(interval);
    }, [filterStatus, searchId]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'OK': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> OK</Badge>;
            case 'ERROR': return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
            case 'PENDING': return <Badge className="bg-blue-100 text-blue-700 border-blue-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between item-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Webhook Health</h1>
                    <p className="text-muted-foreground">Monitoreo de eventos de Stripe y facturación.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
                        <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                        Refrescar
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <Input
                            placeholder="Buscar por Event ID..."
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                        />
                    </div>
                    <div className="w-[200px]">
                        <Select
                            options={[
                                { value: "ALL", label: "Todos" },
                                { value: "OK", label: "OK" },
                                { value: "ERROR", label: "Error" },
                                { value: "PENDING", label: "Pending" }
                            ]}
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            placeholder="Estado"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <div className="border rounded-lg bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Event Type</TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {events.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No events found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            events.map((event) => (
                                <TableRow key={event.id} className="group">
                                    <TableCell>{getStatusBadge(event.status)}</TableCell>
                                    <TableCell className="font-medium font-mono text-xs max-w-[200px] truncate" title={event.type}>{event.type}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono max-w-[150px] truncate" title={event.id}>{event.id}</TableCell>
                                    <TableCell className="text-xs">
                                        {format(new Date(event.createdAt), "dd MMM HH:mm:ss", { locale: es })}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {event.durationMs ? `${event.durationMs}ms` : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(event)}>
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedEvent}
                onClose={() => setSelectedEvent(null)}
                title="Detalle del Evento"
                description={selectedEvent?.id}
                maxWidth="2xl"
            >
                {selectedEvent && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            {getStatusBadge(selectedEvent.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Type</span>
                                <span className="font-mono">{selectedEvent.type}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Created</span>
                                {format(new Date(selectedEvent.createdAt), "Pp", { locale: es })}
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Processed</span>
                                {selectedEvent.processedAt ? format(new Date(selectedEvent.processedAt), "Pp", { locale: es }) : '-'}
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Duration</span>
                                {selectedEvent.durationMs}ms
                            </div>
                            {selectedEvent.orgId && (
                                <div>
                                    <span className="text-muted-foreground block text-xs uppercase tracking-wider">Organization ID</span>
                                    <span className="font-mono text-xs">{selectedEvent.orgId}</span>
                                </div>
                            )}
                        </div>

                        {selectedEvent.error && (
                            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md">
                                <h4 className="text-red-700 dark:text-red-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Error Trace
                                </h4>
                                <pre className="text-xs text-red-600 dark:text-red-300 whitespace-pre-wrap font-mono">
                                    {selectedEvent.error}
                                </pre>
                            </div>
                        )}

                        <div>
                            <h4 className="text-muted-foreground text-xs font-bold uppercase mb-2">Payload Snapshot</h4>
                            <div className="bg-zinc-950 text-zinc-50 p-4 rounded-lg overflow-x-auto max-h-[300px]">
                                <pre className="text-xs font-mono">
                                    {JSON.stringify(selectedEvent.data, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
