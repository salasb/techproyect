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
 * Return-based (No throw) for safer Server Action integration.
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

        if (role === 'SUPERADMIN') {
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

        const subscription = await prisma.subscription.findUnique({
            where: { organizationId: orgId },
            select: {
                status: true,
                trialEndsAt: true
            }
        });

        const subStatus = subscription?.status || null;
        const trialEnd = subscription?.trialEndsAt || null;

        if (!subscription) {
            return { 
                allowed: true, 
                reason: 'OK', 
                message: 'Acceso concedido.', 
                orgId,
                subscriptionStatus: null,
                trialEndsAt: null,
                bypassApplied: false,
                userId,
                traceId
            };
        }

        if (subStatus === SubscriptionStatus.PAUSED) {
            return {
                allowed: false,
                reason: 'SUBSCRIPTION_PAUSED',
                message: 'Tu espacio está temporalmente en modo solo lectura porque la suscripción está pausada.',
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
                message: 'Tu espacio está en modo solo lectura por un pago pendiente.',
                orgId,
                subscriptionStatus: subStatus,
                trialEndsAt: trialEnd,
                bypassApplied: false,
                userId,
                traceId
            };
        }

        if (subStatus === SubscriptionStatus.TRIALING && trialEnd) {
            if (new Date() > trialEnd) {
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
        console.error(`[WriteGuard][${traceId}] Error:`, error.message);
        return {
            allowed: false,
            reason: 'UNAUTHORIZED',
            message: 'No se pudo validar el permiso de escritura.',
            orgId: null,
            subscriptionStatus: null,
            trialEndsAt: null,
            bypassApplied: false,
            traceId
        };
    }
}

/**
 * Throw-based guard for legacy compatibility or strict enforcement.
 * USE WITH CAUTION in Server Actions.
 */
export async function ensureWriteAccess() {
    const context = await getWriteAccessContext();
    if (!context.allowed) {
        throw new Error(`READ_ONLY_MODE:${context.message}`);
    }
    return context;
}
