import prisma from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { requireOperationalScope } from "./server-resolver";

export type WriteAccessReason = 
    | 'OK' 
    | 'TRIAL_EXPIRED' 
    | 'SUBSCRIPTION_PAUSED' 
    | 'SUBSCRIPTION_CANCELED' 
    | 'SUBSCRIPTION_PAST_DUE'
    | 'NO_ACTIVE_ORG' 
    | 'NO_MEMBERSHIP' 
    | 'STAFF_BYPASS' 
    | 'EXPLICIT_READ_ONLY'
    | 'UNAUTHORIZED';

export interface WriteAccessContext {
    allowed: boolean;
    reason: WriteAccessReason;
    message: string;
    orgId: string | null;
    subscriptionStatus: string | null;
    trialEndsAt: Date | null;
    bypassApplied: boolean;
    userId?: string;
    traceId: string;
}

/**
 * Canonical helper to check if the current context allows write operations.
 * Implements Rule 1, 2 & 3: Consolidated source of truth with observability.
 */
export async function getWriteAccessContext(): Promise<WriteAccessContext> {
    const traceId = `WRC-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    try {
        const scope = await requireOperationalScope();
        const { orgId, userId, role } = scope;

        if (!orgId) {
            return {
                allowed: false,
                reason: 'NO_ACTIVE_ORG',
                message: 'No se ha seleccionado una organización activa para operar.',
                orgId: null,
                subscriptionStatus: null,
                trialEndsAt: null,
                bypassApplied: false,
                userId,
                traceId
            };
        }

        // Rule 2: SUPERADMIN / Staff Bypass
        // Internal staff should always be able to operate for support/demo purposes
        if (role === 'SUPERADMIN') {
            console.log(`[WriteGuard][${traceId}] STAFF BYPASS APPLIED for user ${userId} on org ${orgId}`);
            return { 
                allowed: true, 
                reason: 'STAFF_BYPASS', 
                message: 'Acceso administrativo concedido.', 
                orgId,
                subscriptionStatus: 'BYPASS',
                trialEndsAt: null,
                bypassApplied: true,
                userId,
                traceId
            };
        }

        // Fetch subscription state from DB
        const subscription = await prisma.subscription.findUnique({
            where: { organizationId: orgId },
            select: {
                status: true,
                trialEndsAt: true
            }
        });

        const subStatus = subscription?.status || null;
        const trialEnd = subscription?.trialEndsAt || null;

        console.log(`[WriteGuard][${traceId}] Checking org: ${orgId}, Status: ${subStatus}, TrialEnd: ${trialEnd}`);

        if (!subscription) {
            // No subscription record found. Rule: Default allow for legacy/bootstrap orgs
            // but return OK with limited context.
            return { 
                allowed: true, 
                reason: 'OK', 
                message: 'Suscripción no configurada (Default Allow).', 
                orgId,
                subscriptionStatus: null,
                trialEndsAt: null,
                bypassApplied: false,
                userId,
                traceId
            };
        }

        // Evaluate business blocking rules (Rule 1)
        if (subStatus === SubscriptionStatus.PAUSED) {
            return {
                allowed: false,
                reason: 'SUBSCRIPTION_PAUSED',
                message: 'Tu espacio está temporalmente en modo solo lectura porque la suscripción está pausada. Reanuda la suscripción para realizar cambios.',
                orgId,
                subscriptionStatus: subStatus,
                trialEndsAt: trialEnd,
                bypassApplied: false,
                userId,
                traceId
            };
        }

        if (subStatus === SubscriptionStatus.CANCELED) {
            return {
                allowed: false,
                reason: 'SUBSCRIPTION_CANCELED',
                message: 'Tu espacio está en modo solo lectura porque la suscripción ha sido cancelada.',
                orgId,
                subscriptionStatus: subStatus,
                trialEndsAt: trialEnd,
                bypassApplied: false,
                userId,
                traceId
            };
        }

        if (subStatus === SubscriptionStatus.PAST_DUE) {
            return {
                allowed: false,
                reason: 'SUBSCRIPTION_PAST_DUE',
                message: 'Tu espacio está en modo solo lectura por un pago pendiente. Actualiza tu método de pago para continuar.',
                orgId,
                subscriptionStatus: subStatus,
                trialEndsAt: trialEnd,
                bypassApplied: false,
                userId,
                traceId
            };
        }

        // Trial validation
        if (subStatus === SubscriptionStatus.TRIALING && trialEnd) {
            const isExpired = new Date() > trialEnd;
            if (isExpired) {
                return {
                    allowed: false,
                    reason: 'TRIAL_EXPIRED',
                    message: 'Tu periodo de prueba ha expirado. Activa un plan para continuar creando clientes y proyectos.',
                    orgId,
                    subscriptionStatus: subStatus,
                    trialEndsAt: trialEnd,
                    bypassApplied: false,
                    userId,
                    traceId
                };
            }
        }

        return { 
            allowed: true, 
            reason: 'OK', 
            message: 'Acceso concedido.', 
            orgId,
            subscriptionStatus: subStatus,
            trialEndsAt: trialEnd,
            bypassApplied: false,
            userId,
            traceId
        };

    } catch (error: any) {
        console.error(`[WriteGuard][${traceId}] Error resolving write access:`, error.message);
        return {
            allowed: false,
            reason: 'UNAUTHORIZED',
            message: 'No se pudo validar el permiso de escritura. Por favor reintenta o inicia sesión de nuevo.',
            orgId: null,
            subscriptionStatus: null,
            trialEndsAt: null,
            bypassApplied: false,
            traceId
        };
    }
}

/**
 * Throwing guard for Server Actions.
 * Throws an error with the localized message if not allowed.
 */
export async function ensureWriteAccess() {
    const context = await getWriteAccessContext();
    if (!context.allowed) {
        throw new Error(`READ_ONLY_MODE:${context.message}`);
    }
    return context;
}
