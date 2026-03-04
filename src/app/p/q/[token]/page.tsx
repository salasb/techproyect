import { ShareService } from "@/services/share-service";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, CreditCard, Clock, FileText, Building2, ShieldCheck, ArrowRight } from "lucide-react";
import { acceptPublicQuoteAction, payPublicInvoiceAction } from "@/actions/public-quotes";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const dynamic = 'force-dynamic';

export default async function PublicQuotePage(props: { params: Promise<{ token: string }> }) {
    const { token } = await props.params;
    const shareLink = await ShareService.resolveToken(token);

    if (!shareLink) notFound();

    const quote = shareLink.quote;
    const org = shareLink.organization;
    const invoice = quote.invoices[0];
    
    const isPending = quote.status === 'PENDING' || quote.status === 'DRAFT';
    const isAccepted = quote.status === 'ACCEPTED';
    const isPaid = invoice?.status === 'PAID';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-12 font-sans selection:bg-blue-100">
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
                
                {/* Header Público */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border/50 pb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-900/20 rotate-3">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tighter italic">{org.name}</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portal de Clientes • Cotización #{quote.version}</p>
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
                    {/* Detalles de Cotización */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-zinc-900">
                            <CardHeader className="p-8 md:p-12 bg-slate-50 dark:bg-zinc-800/50 border-b border-border/50">
                                <CardTitle className="text-3xl font-black tracking-tighter italic uppercase">Detalle del Proyecto</CardTitle>
                                <CardDescription className="font-medium italic">{quote.project.name}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 md:p-12 space-y-10">
                                {/* Items */}
                                <div className="space-y-4">
                                    {quote.items.map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-center py-4 border-b border-slate-100 dark:border-zinc-800 last:border-0 group">
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold uppercase text-slate-900 dark:text-white">{item.detail}</p>
                                                <p className="text-[10px] text-slate-400 font-medium italic">{item.quantity} {item.unit} • ${item.priceNet.toLocaleString('es-CL')}/un</p>
                                            </div>
                                            <span className="font-black text-slate-900 dark:text-white italic text-sm">
                                                ${(item.quantity * item.priceNet).toLocaleString('es-CL')}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Totales */}
                                <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-[2rem] p-8 space-y-3">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <span>Neto</span>
                                        <span>${quote.totalNet.toLocaleString('es-CL')}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <span>IVA (19%)</span>
                                        <span>${quote.totalTax.toLocaleString('es-CL')}</span>
                                    </div>
                                    <div className="pt-3 border-t border-slate-200 dark:border-zinc-700 flex justify-between items-end">
                                        <span className="text-xs font-black uppercase italic tracking-widest text-blue-600">Total Final</span>
                                        <span className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter">
                                            ${(quote.totalNet + quote.totalTax).toLocaleString('es-CL')}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Acciones del Cliente */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-zinc-900 sticky top-8">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-lg font-black uppercase italic tracking-tight">Acciones</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-6">
                                
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
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex items-start gap-3">
                                            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                                            <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium italic leading-relaxed">
                                                Cotización aceptada. Puedes proceder al pago seguro para iniciar el proyecto.
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
                                    </div>
                                )}

                                {isPaid && (
                                    <div className="space-y-4">
                                        <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl border border-emerald-100 dark:border-emerald-800/50 text-center space-y-3">
                                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                                            <h3 className="font-black uppercase italic tracking-tight text-emerald-900 dark:text-emerald-100">Pago Recibido</h3>
                                            <p className="text-[10px] text-emerald-700/70 dark:text-emerald-400 font-medium italic">
                                                Gracias por tu pago. El equipo de {org.name} ha sido notificado y comenzará a trabajar pronto.
                                            </p>
                                        </div>
                                        <Button variant="outline" className="w-full h-12 rounded-xl border-slate-200 font-bold uppercase text-[10px] tracking-widest">
                                            Descargar Recibo
                                        </Button>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 space-y-4">
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Validez</span>
                                    </div>
                                    <p className="text-xs font-medium italic text-slate-500">
                                        Válido hasta el {format(shareLink.expiresAt, "dd 'de' MMMM", { locale: es })}.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Footer Security */}
                <div className="pt-8 flex justify-center items-center gap-6 opacity-50 grayscale hover:opacity-100 transition-all duration-500">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Secure TLS 1.3</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest">PCI-DSS Compliant</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
