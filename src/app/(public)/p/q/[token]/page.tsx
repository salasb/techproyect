import { notFound } from "next/navigation";
import { ShareLinkService } from "@/services/share-link-service";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle2, FileText, Ban, XCircle, CreditCard, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import { acceptPublicQuoteAction, payPublicInvoiceAction } from "@/actions/public-quotes";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    }
};

// Force dynamic to ensure token is validated on every request
export const dynamic = 'force-dynamic';

export default async function PublicQuotePage(props: { params: Promise<{ token: string }>, searchParams: Promise<{ payment?: string }> }) {
    const { token } = await props.params;
    const searchParams = await props.searchParams;

    // 1. Verify Token
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
                    client: true,
                    company: true
                }
            },
            items: { where: { isSelected: true } },
            invoices: { orderBy: { createdAt: 'desc' }, take: 1 }
        }
    });

    if (!quote) return notFound();

    const organization = await prisma.organization.findUnique({
        where: { id: link.organizationId }
    });

    const invoice = quote.invoices[0];
    const isPending = quote.status === 'DRAFT' || quote.status === 'SENT';
    const isAccepted = quote.status === 'ACCEPTED';
    const isPaid = invoice?.status === 'PAID';
    const isProcessingPayment = searchParams.payment === 'success' && !isPaid;

    // 3. UI
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-100">
            <main className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto p-4 md:p-8">
                {/* Context Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                        {organization?.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={organization.logoUrl} alt="Logo" className="w-12 h-12 object-contain bg-zinc-50 rounded-xl p-1" />
                        ) : (
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-xl">
                                {organization?.name?.[0]}
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-black tracking-tighter uppercase italic">{organization?.name}</h1>
                            <p className="text-xs text-muted-foreground flex items-center gap-2 font-bold uppercase tracking-widest">
                                <FileText className="w-3.5 h-3.5" /> Cotización #{quote.version}
                            </p>
                        </div>
                    </div>

                    <Badge className={cn(
                        "px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[10px] border-none shadow-sm",
                        isPaid ? "bg-emerald-500 text-white" :
                        isAccepted ? "bg-blue-500 text-white" :
                        "bg-amber-500 text-white animate-pulse"
                    )}>
                        {isPaid ? "Pagada" : isAccepted ? "Aceptada" : "Pendiente"}
                    </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Document Body */}
                    <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                        {/* Header Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 md:p-12 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <div>
                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Cliente</h3>
                                <p className="font-black text-xl italic uppercase tracking-tight">{(quote as any).project.client?.name || 'Cliente General'}</p>
                                <p className="text-sm text-muted-foreground font-medium italic">{(quote as any).project.client?.email}</p>
                            </div>
                            <div className="text-left md:text-right">
                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Detalles</h3>
                                <p className="text-sm font-bold flex md:justify-end items-center gap-2 uppercase">
                                    <Calendar className="w-4 h-4 text-zinc-400" />
                                    {format(new Date(quote.createdAt), "dd 'de' MMMM, yyyy", { locale: es })}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 font-medium italic">Válido por 30 días</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="p-8 md:p-12">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                        <th className="py-4 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Descripción</th>
                                        <th className="py-4 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Cant.</th>
                                        <th className="py-4 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-sans">
                                    {quote.items.map((item: any) => (
                                        <tr key={item.id} className="group">
                                            <td className="py-6 px-4 align-top">
                                                <p className="font-bold text-slate-900 dark:text-white uppercase text-sm">{item.detail}</p>
                                                <p className="text-xs text-muted-foreground italic">{item.sku}</p>
                                            </td>
                                            <td className="py-6 px-4 text-right align-top font-medium text-sm">{item.quantity}</td>
                                            <td className="py-6 px-4 text-right align-top font-black italic text-sm">
                                                ${(item.priceNet * item.quantity).toLocaleString('es-CL')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={2} className="pt-10 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">Subtotal Neto</td>
                                        <td className="pt-10 text-right font-black italic text-lg">${quote.totalNet.toLocaleString('es-CL')}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={2} className="text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">IVA (19%)</td>
                                        <td className="text-right font-bold text-zinc-500 italic">${quote.totalTax.toLocaleString('es-CL')}</td>
                                    </tr>
                                    <tr className="text-2xl">
                                        <td colSpan={2} className="pt-6 text-right font-black uppercase italic tracking-tighter text-primary">Total Final</td>
                                        <td className="pt-6 text-right font-black italic tracking-tighter text-slate-900 dark:text-white">${(quote.totalNet + quote.totalTax).toLocaleString('es-CL')}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Sidebar Actions */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-zinc-900 sticky top-8 overflow-hidden">
                            <CardHeader className="p-8 pb-4 bg-slate-50 dark:bg-zinc-800/50 border-b border-border/50">
                                <CardTitle className="text-lg font-black uppercase italic tracking-tight">Gestión del Cliente</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-6 space-y-6">
                                
                                {isPending && (
                                    <form action={async () => {
                                        'use server';
                                        await acceptPublicQuoteAction(token);
                                    }}>
                                        <Button className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-blue-900/30 group">
                                            Aceptar Cotización <CheckCircle2 className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
                                        </Button>
                                    </form>
                                )}

                                {isAccepted && !isPaid && (
                                    <div className="space-y-4">
                                        {isProcessingPayment ? (
                                            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800/50 text-center space-y-3 animate-pulse">
                                                <Loader2 className="w-10 h-10 text-blue-600 mx-auto animate-spin" />
                                                <h3 className="font-black uppercase italic tracking-tight text-blue-900 dark:text-blue-100">Procesando Pago</h3>
                                                <p className="text-[10px] text-blue-700/70 dark:text-blue-400 font-medium italic">
                                                    Estamos confirmando tu transacción con Stripe.
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex items-start gap-3 text-blue-700">
                                                    <ShieldCheck className="w-5 h-5 shrink-0" />
                                                    <p className="text-[10px] font-bold italic leading-relaxed uppercase tracking-tight">
                                                        Aceptada. Paga ahora para iniciar el proyecto de inmediato.
                                                    </p>
                                                </div>
                                                <form action={async () => {
                                                    'use server';
                                                    const res = await payPublicInvoiceAction(token);
                                                    const { redirect } = await import("next/navigation");
                                                    if (res.url) redirect(res.url);
                                                }}>
                                                    <Button className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-emerald-900/30 group">
                                                        Pagar con Stripe <CreditCard className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
                                                    </Button>
                                                </form>
                                            </>
                                        )}
                                    </div>
                                )}

                                {isPaid && (
                                    <div className="space-y-4">
                                        <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl border border-emerald-100 dark:border-emerald-800/50 text-center space-y-3">
                                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                                            <h3 className="font-black uppercase italic tracking-tight text-emerald-900 dark:text-emerald-100">Documento Pagado</h3>
                                            <p className="text-[10px] text-emerald-700/70 dark:text-emerald-400 font-medium italic">
                                                Gracias por tu pago. El equipo ha sido notificado.
                                            </p>
                                        </div>
                                        <Button variant="outline" className="w-full h-12 rounded-xl border-slate-200 font-black uppercase text-[10px] tracking-widest">
                                            Descargar Comprobante
                                        </Button>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 space-y-4">
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <ShieldCheck className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Seguridad Garantizada</span>
                                    </div>
                                    <p className="text-[10px] font-medium italic text-slate-500 leading-relaxed">
                                        Este enlace es único y privado. Sus datos están protegidos bajo estándares de encriptación TLS 1.3.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}

function ErrorState({ error }: { error?: string }) {
    const config = {
        INVALID: { title: "Enlace Inválido", msg: "Este enlace no existe o es incorrecto.", icon: XCircle, color: "text-rose-500" },
        EXPIRED: { title: "Enlace Expirado", msg: "Este enlace ha caducado por seguridad.", icon: Calendar, color: "text-amber-500" },
        REVOKED: { title: "Acceso Revocado", msg: "El acceso a este documento ha sido revocado.", icon: Ban, color: "text-slate-400" },
    };
    // @ts-ignore
    const { title, msg, icon: Icon, color } = config[error || 'INVALID'];

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full rounded-[3rem] p-12 text-center space-y-6 shadow-2xl border-none">
                <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-slate-50 shadow-inner", color)}>
                    <Icon className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">{title}</h2>
                <p className="text-slate-500 font-medium italic leading-relaxed">{msg}</p>
                <div className="pt-6">
                    <Button variant="outline" className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs border-slate-200">Contactar al Emisor</Button>
                </div>
            </Card>
        </div>
    );
}
