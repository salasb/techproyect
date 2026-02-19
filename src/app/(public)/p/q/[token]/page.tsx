import { notFound } from "next/navigation";
import { ShareLinkService } from "@/services/share-link-service";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle2, FileText, Ban, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    }
};

// Force dynamic to ensure token is validated on every request
export const dynamic = 'force-dynamic';

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    // 1. Verify Token (and check simple rate limit by access count?)
    const auth = await ShareLinkService.verifyLink(token);

    if (!auth.isValid) {
        return <ErrorState error={auth.error} />;
    }

    const { link } = auth;
    if (!link || link.entityType !== 'QUOTE') return notFound();

    // 2. Fetch Quote Data
    const quote = await prisma.quote.findUnique({
        where: { id: link.entityId },
        include: {
            project: {
                include: {
                    Client: true,
                    company: true
                }
            },
            items: true,
        }
    });

    if (!quote) return notFound();

    const organization = await prisma.organization.findUnique({
        where: { id: link.organizationId }
    });

    // 3. UI
    return (
        <main className="space-y-8 animate-in fade-in duration-500">
            {/* Context Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                    {organization?.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={organization.logoUrl} alt="Logo" className="w-12 h-12 object-contain bg-zinc-50 rounded-lg p-1" />
                    ) : (
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-xl">
                            {organization?.name?.[0]}
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">{organization?.name}</h1>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Cotización #{quote.version}
                        </p>
                    </div>
                </div>

                <StatusBadge status={quote.status} />
            </div>

            {/* Document Body */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                {/* Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div>
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Cliente</h3>
                        <p className="font-semibold text-lg">{(quote as any).project.Client?.name || 'Cliente General'}</p>
                        <p className="text-sm text-muted-foreground">{(quote as any).project.Client?.email}</p>
                        <p className="text-sm text-muted-foreground">{(quote as any).project.Client?.address}</p>
                    </div>
                    <div className="text-left md:text-right">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Detalles</h3>
                        <p className="text-sm font-medium flex md:justify-end items-center gap-2">
                            <Calendar className="w-4 h-4 text-zinc-400" />
                            Fecha: {format(new Date(quote.createdAt), "dd 'de' MMMM, yyyy", { locale: es })}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Validez: 15 días</p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="p-8">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase">Ítem</th>
                                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase text-right">Cant.</th>
                                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase text-right">Precio Unit.</th>
                                <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {(quote as any).items.map((item: any) => (
                                <tr key={item.id}>
                                    <td className="py-4 px-4 align-top">
                                        <p className="font-medium">{item.detail}</p>
                                        <p className="text-xs text-muted-foreground">{item.sku}</p>
                                    </td>
                                    <td className="py-4 px-4 text-right align-top">{item.quantity}</td>
                                    <td className="py-4 px-4 text-right align-top font-mono">
                                        ${item.priceNet.toLocaleString('es-CL')}
                                    </td>
                                    <td className="py-4 px-4 text-right align-top font-mono font-bold">
                                        ${(item.priceNet * item.quantity).toLocaleString('es-CL')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3} className="pt-6 text-right text-sm font-medium text-muted-foreground">Subtotal Neto</td>
                                <td className="pt-6 text-right font-mono font-bold text-lg">${quote.totalNet.toLocaleString('es-CL')}</td>
                            </tr>
                            <tr>
                                <td colSpan={3} className="text-right text-sm font-medium text-muted-foreground">IVA (19%)</td>
                                <td className="text-right font-mono text-zinc-500">${quote.totalTax.toLocaleString('es-CL')}</td>
                            </tr>
                            <tr className="text-xl">
                                <td colSpan={3} className="pt-4 text-right font-black">Total</td>
                                <td className="pt-4 text-right font-mono font-black text-primary">${(quote.totalNet + quote.totalTax).toLocaleString('es-CL')}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Actions Footer */}
                {quote.status === 'DRAFT' || quote.status === 'SENT' ? (
                    <div className="p-8 bg-zinc-50 dark:bg-zinc-950/30 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
                        <Button variant="outline">Descargar PDF</Button>
                        <form action={`/api/public/quotes/${token}/accept`} method="POST">
                            <Button size="lg" className="font-bold shadow-xl shadow-primary/20">
                                Aceptar Cotización <CheckCircle2 className="ml-2 w-5 h-5" />
                            </Button>
                        </form>
                    </div>
                ) : quote.status === 'ACCEPTED' ? (
                    <div className="p-8 bg-emerald-50 dark:bg-emerald-950/30 border-t border-emerald-100 dark:border-emerald-900 text-center">
                        <h3 className="text-emerald-800 dark:text-emerald-400 font-bold text-lg mb-1 flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-5 h-5" /> Cotización Aceptada
                        </h3>
                        <p className="text-sm text-emerald-600 dark:text-emerald-500">
                            Procesada el {format(new Date(quote.updatedAt), "dd 'de' MMMM, yyyy", { locale: es })}
                        </p>
                    </div>
                ) : quote.status === 'REVISED' ? (
                    <div className="p-8 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-100 dark:border-amber-900 text-center">
                        <h3 className="text-amber-800 dark:text-amber-400 font-bold text-lg mb-1">
                            Nueva Versión Disponible
                        </h3>
                        <p className="text-sm text-amber-600 dark:text-amber-500">
                            Esta cotización ha sido actualizada. Por favor, solicite el enlace de la versión más reciente.
                        </p>
                    </div>
                ) : (
                    <div className="p-8 bg-zinc-50 dark:bg-zinc-950/30 border-t border-zinc-100 dark:border-zinc-800 text-center text-sm text-muted-foreground">
                        Esta cotización ya no está disponible para aceptación ({quote.status}).
                    </div>
                )}
            </div>
        </main>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        DRAFT: "bg-zinc-100 text-zinc-600 border-zinc-200",
        SENT: "bg-blue-100 text-blue-700 border-blue-200",
        ACCEPTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
        REJECTED: "bg-red-100 text-red-700 border-red-200",
        FROZEN: "bg-amber-100 text-amber-700 border-amber-200",
    };
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-widest ${styles[status] || styles.DRAFT}`}>
            {status}
        </span>
    );
}

function ErrorState({ error }: { error?: string }) {
    const config = {
        INVALID: { title: "Enlace Inválido", msg: "Este enlace no existe o es incorrecto.", icon: XCircle },
        EXPIRED: { title: "Enlace Expirado", msg: "Este enlace ha caducado por seguridad.", icon: Calendar },
        REVOKED: { title: "Acceso Revocado", msg: "El acceso a este documento ha sido revocado.", icon: Ban },
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { title, msg, icon: Icon } = config[error || 'INVALID'];

    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md mx-auto p-8">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-8 h-8 text-zinc-400" />
                </div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{title}</h2>
                <p className="text-zinc-500">{msg}</p>
                <div className="pt-6">
                    <Button variant="outline" className="w-full">Contactar al Emisor</Button>
                </div>
            </div>
        </div>
    );
}
