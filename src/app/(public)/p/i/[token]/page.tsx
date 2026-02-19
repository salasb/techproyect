import { notFound } from "next/navigation";
import { ShareLinkService } from "@/services/share-link-service";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle2, FileText, Ban, XCircle, CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

// Force dynamic to ensure token is validated on every request
export const dynamic = 'force-dynamic';

export default async function PublicInvoicePage({ params }: { params: { token: string } }) {
    const { token } = params;

    // 1. Verify Token
    const auth = await ShareLinkService.verifyLink(token);

    if (!auth.isValid) {
        return <ErrorState error={auth.error} />;
    }

    const { link } = auth;
    if (!link || link.entityType !== 'INVOICE') return notFound();

    // 2. Fetch Invoice Data
    const invoice = await prisma.invoice.findUnique({
        where: { id: link.entityId },
        include: {
            project: {
                include: {
                    Client: true,
                    company: true
                }
            }
        }
    });

    if (!invoice) return notFound();

    const organization = await prisma.organization.findUnique({
        where: { id: link.organizationId }
    });

    const isPaid = invoice.amountPaidGross >= invoice.amountInvoicedGross;

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
                            <FileText className="w-4 h-4" /> Factura/Cobro
                        </p>
                    </div>
                </div>

                <StatusBadge isPaid={isPaid} />
            </div>

            {/* Document Body */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                {/* Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div>
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">A Nombre De</h3>
                        <p className="font-semibold text-lg">{(invoice as any).project.Client?.name || 'Cliente General'}</p>
                        <p className="text-sm text-muted-foreground">{(invoice as any).project.Client?.taxId}</p>
                        <p className="text-sm text-muted-foreground">{(invoice as any).project.Client?.address}</p>
                    </div>
                    <div className="text-left md:text-right">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Vencimiento</h3>
                        <p className="text-sm font-medium flex md:justify-end items-center gap-2">
                            <Calendar className="w-4 h-4 text-zinc-400" />
                            {invoice.dueDate ? format(new Date(invoice.dueDate), "dd 'de' MMMM, yyyy", { locale: es }) : 'Al contado'}
                        </p>
                    </div>
                </div>

                {/* Amount Display */}
                <div className="p-12 text-center space-y-2">
                    <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Monto a Pagar</p>
                    <div className="text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
                        ${(invoice.amountInvoicedGross - invoice.amountPaidGross).toLocaleString('es-CL')}
                    </div>
                    {invoice.amountPaidGross > 0 && (
                        <p className="text-sm text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3 h-3 inline mr-1" />
                            Pagado a la fecha: ${invoice.amountPaidGross.toLocaleString('es-CL')}
                        </p>
                    )}
                </div>

                {/* Actions Footer */}
                {!isPaid ? (
                    <div className="p-8 bg-zinc-50 dark:bg-zinc-950/30 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
                        <Button variant="outline">Descargar PDF</Button>
                        <form action={`/api/public/invoices/${token}/pay`} method="POST">
                            <Button size="lg" className="font-bold shadow-xl shadow-primary/20 bg-emerald-600 hover:bg-emerald-700 text-white">
                                <CreditCard className="w-5 h-5 mr-2" /> Pagar Ahora
                            </Button>
                        </form>
                    </div>
                ) : (
                    <div className="p-8 bg-emerald-50 dark:bg-emerald-900/10 border-t border-emerald-100 dark:border-emerald-900 text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                        <h3 className="font-bold text-emerald-800 dark:text-emerald-400">Esta factura está pagada</h3>
                        <p className="text-xs text-emerald-600/80">Gracias por su negocio.</p>
                    </div>
                )}

                <div className="bg-zinc-50/50 p-4 text-center text-[10px] text-zinc-400 flex items-center justify-center gap-1 border-t border-zinc-100">
                    <Lock className="w-3 h-3" /> Pagos procesados de forma segura por Stripe
                </div>
            </div>
        </main>
    );
}

function StatusBadge({ isPaid }: { isPaid: boolean }) {
    if (isPaid) {
        return (
            <span className="px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-widest bg-emerald-100 text-emerald-700 border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Pagada
            </span>
        );
    }
    return (
        <span className="px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-widest bg-amber-100 text-amber-700 border-amber-200">
            Pendiente de Pago
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
