'use server'

import { createClient } from "@/lib/supabase/server";
import { requireOperationalScope } from "@/lib/auth/server-resolver";
import { ActivationService } from "@/services/activation-service";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function requestUpgrade(planId: string) {
    const traceId = `UPG-${Math.random().toString(36).substring(7).toUpperCase()}`;
    try {
        const scope = await requireOperationalScope();
        const supabase = await createClient();

        // 1. Get User Info
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        // Milestone: Upgrade Clicked
        if (scope.orgId !== 'GLOBAL_CONTEXT') {
            await ActivationService.trackFunnelEvent('UPGRADE_CLICKED', scope.orgId, `upgrade_click_${scope.orgId}_${planId}_${Date.now()}`, user.id);
        }

        await prisma.auditLog.create({
            data: {
                organizationId: scope.orgId === 'GLOBAL_CONTEXT' ? null : scope.orgId,
                userId: user.id,
                action: 'UPGRADE_INTENT',
                details: `User requested upgrade to plan ${planId} [Trace: ${traceId}]`
            }
        });

        // 2. Validate Plan Exists
        const { data: plan } = await supabase.from('Plan').select('name').eq('id', planId).single();
        if (!plan) throw new Error("Plan no encontrado.");

        // 3. Log the Request
        if (scope.orgId !== 'GLOBAL_CONTEXT') {
            await supabase.from('AuditLog').insert({
                organizationId: scope.orgId,
                actorId: user.id,
                action: 'SUBSCRIPTION_UPGRADE_REQUEST',
                details: `Solicitud de actualización a Plan ${plan.name} (${planId})`,
                createdAt: new Date().toISOString()
            });
        }

        return { success: true, message: "Solicitud enviada. Un ejecutivo te contactará en breve." };
    } catch (e: any) {
        console.error(`[Subscription][${traceId}] RequestUpgrade Error:`, e.message);
        return { success: false, error: e.message || "Error al procesar la solicitud." };
    }
}

export async function createCustomerPortalSession() {
    const traceId = `CPS-${Math.random().toString(36).substring(7).toUpperCase()}`;
    let portalUrl: string | null = null;

    try {
        const scope = await requireOperationalScope();
        const prisma = (await import("@/lib/prisma")).default;
        const { getStripe } = await import("@/lib/stripe");

        if (scope.orgId === 'GLOBAL_CONTEXT') {
            throw new Error("No puedes gestionar facturación global desde un contexto de organización individual.");
        }

        const subscription = await prisma.subscription.findUnique({
            where: { organizationId: scope.orgId }
        });

        if (!subscription?.providerCustomerId) {
            throw new Error("Esta organización no tiene un perfil de cliente en la pasarela de pagos.");
        }

        const stripe = getStripe();
        const session = await stripe.billingPortal.sessions.create({
            customer: subscription.providerCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/billing`,
        });

        portalUrl = session.url;
    } catch (e: any) {
        console.error(`[Subscription][${traceId}] PortalSession Error:`, e.message);
        // We cannot return a regular object because createCustomerPortalSession is used in a form action that expects a redirect or nothing
        // But since we want to handle it, we might redirect to an error page or back with a query param
        redirect(`/settings/billing?error=${encodeURIComponent(e.message)}&traceId=${traceId}`);
    }

    if (portalUrl) {
        redirect(portalUrl);
    }
}
