import prisma from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { requireOperationalScope } from "./server-resolver";

export type WriteAccessReason = 
    | 'OK' 
    | 'BILLING_PAUSED' 
    | 'BILLING_CANCELED' 
    | 'BILLING_PAST_DUE'
    | 'TRIAL_EXPIRED'
    | 'ORG_MISSING' 
    | 'NO_MEMBERSHIP' 
    | 'PLAN_RESTRICTED' 
    | 'EXPLICIT_READ_ONLY'
    | 'UNAUTHORIZED';

export interface WriteAccessContext {
    allowed: boolean;
    reason: WriteAccessReason;
    message: string;
    orgId?: string;
}

/**
 * Canonical helper to check if the current context allows write operations.
 * Implements Rule 2 & Rule 3: Single source of truth and role-based bypass.
 */
export async function getWriteAccessContext(): Promise<WriteAccessContext> {
    try {
        const scope = await requireOperationalScope();
        const { orgId, userId, role } = scope;

        if (!orgId) {
            return {
                allowed: false,
                reason: 'ORG_MISSING',
                message: 'No se ha seleccionado una organización activa.'
            };
        }

        // Rule 3: SUPERADMIN bypass
        if (role === 'SUPERADMIN') {
            return { allowed: true, reason: 'OK', message: 'Acceso total concedido (Superadmin).', orgId };
        }

        // Fetch subscription state
        const subscription = await prisma.subscription.findUnique({
            where: { organizationId: orgId },
            select: {
                status: true,
                trialEndsAt: true
            }
        });

        if (!subscription) {
            // If no subscription record, assume it is a legacy org or under special setup.
            // For now, allow but log.
            console.warn(`[WriteGuard] No subscription found for org ${orgId}. Allowing write access by default.`);
            return { allowed: true, reason: 'OK', message: 'Acceso concedido.', orgId };
        }

        const status = subscription.status;

        if (status === SubscriptionStatus.PAUSED) {
            return {
                allowed: false,
                reason: 'BILLING_PAUSED',
                message: 'Tu espacio está temporalmente en modo solo lectura porque la suscripción está pausada. Reanuda la suscripción para realizar cambios.',
                orgId
            };
        }

        if (status === SubscriptionStatus.CANCELED) {
            return {
                allowed: false,
                reason: 'BILLING_CANCELED',
                message: 'Tu espacio está en modo solo lectura porque la suscripción ha sido cancelada.',
                orgId
            };
        }

        if (status === SubscriptionStatus.PAST_DUE) {
            return {
                allowed: false,
                reason: 'BILLING_PAST_DUE',
                message: 'Tu espacio está en modo solo lectura por un pago pendiente. Actualiza tu método de pago para continuar.',
                orgId
            };
        }

        // Trial validation
        if (status === SubscriptionStatus.TRIALING && subscription.trialEndsAt) {
            const isExpired = new Date() > subscription.trialEndsAt;
            if (isExpired) {
                return {
                    allowed: false,
                    reason: 'TRIAL_EXPIRED',
                    message: 'Tu periodo de prueba ha expirado. Activa un plan para continuar creando clientes y proyectos.',
                    orgId
                };
            }
        }

        return { allowed: true, reason: 'OK', message: 'Acceso concedido.', orgId };

    } catch (error: any) {
        console.error('[WriteGuard] Error resolving write access:', error.message);
        return {
            allowed: false,
            reason: 'UNAUTHORIZED',
            message: 'No se pudo validar el permiso de escritura. Por favor reintenta o inicia sesión de nuevo.'
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
        // We still throw "READ_ONLY_MODE" for the UI interceptor, 
        // but we should ideally pass the message.
        // For now, let's keep the throw but we'll improve the UI to read the message if possible.
        throw new Error(`READ_ONLY_MODE:${context.message}`);
    }
    return context;
}
