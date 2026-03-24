import { resolveAccessContext } from "@/lib/auth/access-resolver";
import { getOrganizationSubscription } from "@/lib/subscriptions";
import { AlertTriangle, CreditCard, AlertCircle, Shield, Zap } from "lucide-react";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BillingClient } from "@/components/settings/BillingClient";
import { redirect } from "next/navigation";
import { getWorkspaceState } from "@/lib/auth/workspace-resolver";
import { resolveCommercialContext } from "@/lib/billing/commercial-domain";
import { PlanModulesCard } from "./components/PlanModulesCard";

export default async function BillingPage() {
    let context;
    try {
        context = await resolveAccessContext();
    } catch (e) {
        redirect("/login");
    }

    const { traceId, activeOrgId, isGlobalOperator } = context;
    
    if (!activeOrgId) {
        return (
            <div className="p-12 text-center bg-muted/20 rounded-xl border-2 border-dashed border-border m-8">
                <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
                <h3 className="text-lg font-bold">Facturación y Planes</h3>
                <p className="text-muted-foreground">Debes seleccionar una organización activa para gestionar su facturación.</p>
                <div className="mt-4 p-2 bg-white/50 rounded font-mono text-[10px] opacity-60">Trace: {traceId}</div>
            </div>
        );
    }

    try {
        console.log(`[Settings][Billing][${traceId}] Loading billing for org=${activeOrgId}`);
        
        const workspace = await getWorkspaceState();
        const commercial = resolveCommercialContext(workspace);

        const [planData, subscription, supabase] = await Promise.all([
            getOrganizationSubscription(activeOrgId).catch(e => {
                console.error(`[BillingPage][${traceId}] Failed to fetch subscription for ${activeOrgId}:`, e);
                return {
                    plan: 'FREE',
                    status: 'ACTIVE',
                    usage: { users: 0, projects: 0, quotesMonth: 0, invoicesMonth: 0, storage: 0 },
                    limits: { maxUsers: 1, maxProjects: 1, maxQuotesPerMonth: 5, maxInvoicesPerMonth: 5 }
                };
            }),
            prisma.subscription.findUnique({
                where: { organizationId: activeOrgId },
                include: { organization: true }
            }),
            createClient()
        ]);

        const entitlements = commercial;
        const display = commercial;

        const { plan } = planData;

        const { data: allPlans } = await supabase
            .from('Plan')
            .select('*')
            .eq('isActive', true)
            .order('price', { ascending: true });
        
        const currentPlanDetails = allPlans?.find(p => p.id === plan);
        const hasPaymentMethod = !!subscription?.providerCustomerId;

        return (
            <div className="space-y-12 animate-in fade-in pb-10">
                {/* Context Banner for Global Operators */}
                {isGlobalOperator && (
                    <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded-r-xl flex items-center gap-3">
                        <Shield className="w-5 h-5 text-indigo-600" />
                        <div>
                            <p className="text-sm text-indigo-800 font-bold uppercase tracking-tight">{display.operatorLabel}</p>
                            <p className="text-xs text-indigo-700">Estás viendo la facturación de la organización <strong>{subscription?.organization?.name || activeOrgId}</strong>. {display.commercialStatusLabel}.</p>
                        </div>
                    </div>
                )}

                {subscription?.status === 'PAUSED' && !isGlobalOperator && (
                    <div className="bg-rose-600 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 animate-in slide-in-from-top-4 duration-700">
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-white/20 rounded-[1.5rem] shadow-inner shrink-0">
                                <AlertTriangle className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black italic tracking-tighter uppercase">Cuenta Pausada (Modo Lectura)</h3>
                                <p className="text-rose-100 text-sm max-w-xl leading-relaxed font-medium">
                                    Tu acceso ha sido restringido por falta de pago. Puedes ver y descargar tus documentos, pero la creación de nuevos registros está bloqueada.
                                </p>
                            </div>
                        </div>
                        <form action={async () => {
                            'use server';
                            const { createPortalSession } = await import("@/actions/billing");
                            await createPortalSession();
                        }}>
                            <Button type="submit" size="lg" className="bg-white text-rose-700 hover:bg-rose-50 px-10 h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all">
                                Resolver Ahora
                            </Button>
                        </form>
                    </div>
                )}

                {display.showTrialBanner && (
                    <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 animate-in slide-in-from-top-4 duration-700">
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-white/20 rounded-[1.5rem] shadow-inner shrink-0">
                                <Zap className="w-8 h-8 text-white fill-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black italic tracking-tighter uppercase italic">Configuración de Facturación Pendiente</h3>
                                <p className="text-indigo-100 text-sm max-w-xl leading-relaxed font-medium">
                                    Tu organización está operando bajo un entorno restringido. Completa la configuración de pagos para asegurar la continuidad de tus proyectos y activar los módulos.
                                </p>
                            </div>
                        </div>
                        <form action={async () => {
                            'use server';
                            const { requestUpgrade } = await import("@/app/actions/subscription");
                            await requestUpgrade("PRO_MONTHLY"); 
                        }}>
                            <Button type="submit" size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 px-10 h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all active:scale-95">
                                Configurar Pagos Ahora
                            </Button>
                        </form>
                    </div>
                )}

                <div className="mt-8">
                    <PlanModulesCard entitlements={entitlements} planName={currentPlanDetails?.name || plan} />
                </div>

                <div className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Facturación y Planes</h1>
                        <p className="text-slate-500 font-medium">Gestiona tu suscripción y consulta tu consumo.</p>
                    </div>
                    {subscription?.providerCustomerId && (
                        <div className="flex flex-col items-end gap-2">
                            <form action={async () => {
                                'use server';
                                const { createCustomerPortalSession } = await import("@/app/actions/subscription");
                                await createCustomerPortalSession();
                            }}>
                                <Button type="submit" variant="outline" className="gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    Gestionar en Stripe
                                </Button>
                            </form>
                        </div>
                    )}
                </div>

                <BillingClient variant="CONTINUITY" />
            </div>
        );
    } catch (error: any) {
        console.error(`[BillingPage][${traceId}] Error:`, error.message);
        return <div className="p-8 text-center text-red-500">Error cargando información de facturación.</div>;
    }
}
