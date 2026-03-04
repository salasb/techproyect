import { requirePermission } from "@/lib/auth/server-resolver";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, ExternalLink, Zap, ShieldCheck, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createCheckoutSession, createPortalSession } from "@/actions/billing";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function BillingPage() {
    const scope = await requirePermission('BILLING_MANAGE');
    const orgId = scope.orgId;

    const subscription = await prisma.subscription.findUnique({
        where: { organizationId: orgId },
        include: { organization: true }
    });

    if (!subscription) return null;

    const isTrial = subscription.status === 'TRIALING';
    const isActive = subscription.status === 'ACTIVE';
    const isPaused = subscription.status === 'PAUSED';
    const isPastDue = subscription.status === 'PAST_DUE';

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Finanzas</span>
                    </div>
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase">Plan y Facturación</h1>
                    <p className="text-muted-foreground font-medium italic underline decoration-blue-500/20 underline-offset-8">Gestiona tu suscripción y métodos de pago de forma segura.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Plan Card */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="rounded-[2.5rem] border-slate-100 dark:border-zinc-800 shadow-xl overflow-hidden">
                        <CardHeader className="p-10 pb-6 bg-slate-50 dark:bg-zinc-800/50 border-b border-border/50">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-2xl font-black uppercase italic tracking-tight">Plan {subscription.planCode}</CardTitle>
                                    <CardDescription className="text-sm font-medium italic">Estado actual de tu suscripción comercial.</CardDescription>
                                </div>
                                <Badge className={cn(
                                    "px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[10px] border-none shadow-sm",
                                    isActive ? "bg-emerald-500 text-white animate-pulse" :
                                    isTrial ? "bg-blue-500 text-white" :
                                    "bg-rose-500 text-white"
                                )}>
                                    {subscription.status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-10 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <Zap className="w-5 h-5 text-blue-600" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Capacidades</span>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-2 text-sm font-medium italic">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {subscription.seatLimit} Asientos de Equipo
                                        </li>
                                        <li className="flex items-center gap-2 text-sm font-medium italic">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Proyectos Ilimitados
                                        </li>
                                        <li className="flex items-center gap-2 text-sm font-medium italic">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Soporte Prioritario
                                        </li>
                                    </ul>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <Clock className="w-5 h-5 text-amber-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Vencimiento</span>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                        {isTrial && subscription.trialEndsAt ? (
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-slate-500 uppercase">Trial finaliza el:</p>
                                                <p className="text-lg font-black italic">{format(subscription.trialEndsAt, "dd 'de' MMMM, yyyy", { locale: es })}</p>
                                            </div>
                                        ) : isActive && subscription.currentPeriodEnd ? (
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-slate-500 uppercase">Próximo cobro:</p>
                                                <p className="text-lg font-black italic">{format(subscription.currentPeriodEnd, "dd 'de' MMMM, yyyy", { locale: es })}</p>
                                            </div>
                                        ) : (
                                            <p className="text-sm font-medium italic text-slate-400">No hay información de periodo disponible.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-border/50 flex flex-wrap gap-4">
                                <form action={createPortalSession}>
                                    <Button type="submit" className="h-14 px-8 bg-slate-900 dark:bg-blue-600 hover:bg-blue-600 text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl transition-all group">
                                        <ExternalLink className="w-4 h-4 mr-2" /> Administrar en Stripe
                                    </Button>
                                </form>
                                {(isTrial || isPaused || isPastDue) && (
                                    <form action={async () => {
                                        'use server';
                                        // price_pro_monthly would be an env var in real scenarios
                                        await createCheckoutSession(process.env.STRIPE_PRICE_ID_PRO || 'price_standard');
                                    }}>
                                        <Button type="submit" variant="outline" className="h-14 px-8 rounded-2xl border-slate-200 font-black uppercase italic tracking-widest hover:bg-slate-50 transition-all">
                                            Actualizar Plan
                                        </Button>
                                    </form>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Restricted States Info */}
                    {(isPaused || isPastDue) && (
                        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/50 p-8 rounded-[2.5rem] flex items-start gap-6 animate-pulse">
                            <div className="bg-rose-100 dark:bg-rose-900/30 p-4 rounded-2xl shadow-inner text-rose-600">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-rose-900 dark:text-rose-100 font-black italic uppercase tracking-tight">Acceso Restringido (Read-Only)</h3>
                                <p className="text-rose-700/80 dark:text-rose-300/80 text-sm font-medium leading-relaxed italic">
                                    Tu cuenta se encuentra en modo lectura debido a un problema con el pago o la suscripción. 
                                    Debes regularizar tu situación en el portal de Stripe para habilitar nuevamente la creación de proyectos y cotizaciones.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                    <Card className="rounded-[2.5rem] border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Seguridad</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-6">
                            <div className="flex items-start gap-3">
                                <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5" />
                                <p className="text-[11px] text-slate-500 font-medium italic leading-relaxed">
                                    No almacenamos tus datos de tarjeta. Toda la facturación es procesada por <span className="font-bold text-slate-900 dark:text-white underline decoration-blue-500/30">Stripe</span> bajo estándares PCI-DSS.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2.5rem] border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Facturación</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0">
                            <p className="text-[11px] text-slate-500 font-medium italic leading-relaxed">
                                Las facturas se generan automáticamente al final de cada periodo. Puedes descargarlas desde el portal de administración.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
