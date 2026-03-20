import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/current-org";

export type AuditEventType =
    | 'INVITE_SENT'
    | 'INVITE_ACCEPTED'
    | 'INVITE_REVOKED'
    | 'MEMBER_ROLE_CHANGED'
    | 'MEMBER_REMOVED'
    | 'ORG_MODE_CHANGED'
    | 'ORG_SETTINGS_CHANGED'
    | 'SUBSCRIPTION_UPDATED'
    | 'BILLING_CHECKOUT_CREATED'
    | 'BILLING_PORTAL_ACCESSED'
    | 'WORKSPACE_CONTEXT_SWITCHED'
    | 'ORG_SWITCH'
    | 'PROJECT_CREATE'
    | 'PROJECT_UPDATE'
    | 'PROJECT_DELETE'
    | 'QUOTE_CREATE'
    | 'QUOTE_UPDATE'
    | 'QUOTE_SENT'
    | 'QUOTE_ACCEPTED'
    | 'QUOTE_REJECTED'
    | 'COST_CREATE'
    | 'COST_UPDATE'
    | 'COST_DELETE'
    | 'INVOICE_GENERATE'
    | 'INVOICE_SENT'
    | 'SUPERADMIN_BOOTSTRAP_PROMOTED';

export interface AuditActor {
    id?: string;
    name?: string;
    ip?: string;
    userAgent?: string;
}

export class AuditService {
    /**
     * Centralized Audit Logger
     * Automatically resolves current user if no actor is provided.
     */
    static async logAction(params: {
        projectId?: string | null;
        action: AuditEventType | string;
        details?: string | null;
        actor?: AuditActor;
        explicitOrgId?: string;
    }) {
        const { projectId = null, action, details = null, actor, explicitOrgId } = params;

        try {
            const orgId = explicitOrgId || await getOrganizationId();
            if (!orgId) {
                console.warn(`[AuditService] Skip logging: No organization context for action=${action}`);
                return;
            }

            let userId = actor?.id || null;
            let userName = actor?.name || 'Sistema';

            // 1. Auto-resolve actor if not provided
            if (!actor) {
                try {
                    const supabase = await createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        userId = user.id;
                        userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Usuario';
                    }
                } catch (e) {
                    // Fail silently on auth resolve
                }
            }

            // 2. Format details with IP if available
            let finalDetails = details;
            if (actor?.ip) {
                finalDetails = `${details || ''} [IP: ${actor.ip}]`.trim();
            }

            // 3. Persist via Prisma
            return await prisma.auditLog.create({
                data: {
                    organizationId: orgId,
                    projectId,
                    userId,
                    userName,
                    action,
                    details: finalDetails,
                },
            });
        } catch (error: any) {
            console.error(`[AuditService] Critical failure logging action ${action}:`, error.message);
            // Never block the main thread for an audit failure
        }
    }
}
