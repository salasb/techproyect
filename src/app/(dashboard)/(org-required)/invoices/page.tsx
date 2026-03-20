import Link from "next/link";
import { InvoiceExportButton } from "@/components/invoices/InvoiceExportButton";
import prisma from "@/lib/prisma";
import { getOrganizationId } from "@/lib/current-org";
import { PaginationControl } from "@/components/ui/PaginationControl";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, AlertCircle, CheckCircle2, CreditCard, Mail } from "lucide-react";
import { PayInvoiceButton } from "@/components/commercial/PayInvoiceButton";
import { SendInvoiceButton } from "@/components/commercial/SendInvoiceButton";
import { InvoicePdfButton } from "@/components/invoices/InvoicePdfButton";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
    const traceId = `INV-LST-${Math.random().toString(36).substring(2, 10).slice(0, 8).toUpperCase()}`;
    const orgId = await getOrganizationId();
    
    if (!orgId) {
        return (
            <div className="p-12 text-center bg-muted/20 rounded-xl border-2 border-dashed border-border m-8">
                <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
                <h3 className="text-lg font-bold">Contexto no detectado</h3>
                <p className="text-muted-foreground">Debes seleccionar una organización para ver la facturación.</p>
            </div>
        );
    }

    const params = await searchParams;
    const page = Number(params?.page) || 1;
    const itemsPerPage = 10;
    const skip = (page - 1) * itemsPerPage;

    try {
        console.log(`[Invoices][${traceId}] Loading invoices for org=${orgId}, page=${page}`);
        
        // Fetch Invoices with Prisma (Direct DB access, bypasses PostgREST permission issues)
        const [invoices, totalCount] = await Promise.all([
            prisma.invoice.findMany({
                where: { organizationId: orgId },
                include: {
                    project: {
                        select: {
                            id: true,
                            name: true,
                            company: { select: { name: true } },
                            client: { select: { name: true } }
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: itemsPerPage
            }),
            prisma.invoice.count({ where: { organizationId: orgId } })
        ]);

        const totalPages = Math.ceil(totalCount / itemsPerPage);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return (
            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">Facturación</h2>
                        <p className="text-muted-foreground text-sm mt-1">Gestiona tus documentos tributarios</p>
                    </div>
                    <div className="flex gap-2">
                        <InvoiceExportButton invoices={invoices as any || []} />
                    </div>
                </div>

                <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                    {invoices.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                <FileText className="w-8 h-8 text-zinc-400" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground">No hay facturas registradas</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                                Aún no has emitido facturas. Las facturas se crean desde la ficha de cada proyecto.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Proyecto / Cliente</th>
                                        <th className="px-6 py-3 font-medium">Detalles</th>
                                        <th className="px-6 py-3 font-medium">Fechas</th>
                                        <th className="px-6 py-3 font-medium">Monto</th>
                                        <th className="px-6 py-3 font-medium text-right">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {invoices.map((inv: any) => {
                                        const isPaid = inv.amountPaidGross >= inv.amountInvoicedGross;
                                        const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date() && !isPaid;

                                        return (
                                            <tr key={inv.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-foreground">
                                                        <Link href={`/projects/${inv.projectId}`} className="hover:underline text-blue-600 dark:text-blue-400">
                                                            {inv.project?.name}
                                                        </Link>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {inv.project?.client?.name || inv.project?.company?.name || 'Cliente General'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs">
                                                    <div className="font-mono text-muted-foreground mb-1">ID: {inv.id.slice(0, 8)}</div>
                                                </td>
                                                <td className="px-6 py-4 text-xs">
                                                    <div className="flex flex-col gap-1">
                                                        {inv.sentDate ? (
                                                            <span className="text-green-600 font-medium">Enviado: {format(new Date(inv.sentDate), 'dd/MM/yyyy')}</span>
                                                        ) : (
                                                            <span className="text-muted-foreground">No enviado</span>
                                                        )}
                                                        {inv.dueDate && (
                                                            <span className={isOverdue ? "text-red-500 font-bold" : "text-muted-foreground"}>
                                                                Vence: {format(new Date(inv.dueDate), 'dd/MM/yyyy')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-medium">
                                                    <div className="flex flex-col">
                                                        <span>${inv.amountInvoicedGross.toLocaleString('es-CL')}</span>
                                                        {inv.amountPaidGross > 0 && inv.amountPaidGross < inv.amountInvoicedGross && (
                                                            <span className="text-xs text-green-600">Pagado: ${inv.amountPaidGross.toLocaleString('es-CL')}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end items-center gap-3">
                                                        <InvoicePdfButton invoice={inv} />
                                                        {!inv.sent && !isPaid && (
                                                            <SendInvoiceButton invoiceId={inv.id} />
                                                        )}
                                                        {!isPaid && inv.sent && (
                                                            <PayInvoiceButton invoiceId={inv.id} />
                                                        )}
                                                        {isPaid ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Pagado
                                                            </span>
                                                        ) : isOverdue ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                                <AlertCircle className="w-3 h-3 mr-1" /> Vencido
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                                Pendiente
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <PaginationControl
                    currentPage={page}
                    totalPages={totalPages}
                    hasNextPage={hasNextPage}
                    hasPrevPage={hasPrevPage}
                />
            </div>
        );
    } catch (error: any) {
        console.error(`[Invoices][${traceId}] Critical error:`, error.message);
        return (
            <div className="p-12 text-center bg-rose-50 border-2 border-rose-200 rounded-xl m-8 text-rose-900">
                <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-4" />
                <h3 className="text-lg font-bold uppercase tracking-tight">Error de Infraestructura Comercial</h3>
                <p className="max-w-md mx-auto mt-2">No se pudo conectar con la base de datos de facturación.</p>
                <div className="mt-4 p-2 bg-white/50 rounded font-mono text-[10px] opacity-60">Trace: {traceId}</div>
            </div>
        );
    }
}
