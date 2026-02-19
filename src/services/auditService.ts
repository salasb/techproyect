import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/current-org";

export class AuditService {
    static async logAction(
        projectId: string | null,
        action: string,
        details?: string,
        actor?: { name?: string; id?: string; ip?: string; userAgent?: string }
    ) {
        try {
            const orgId = await getOrganizationId();
            const supabase = await createClient();

            let userName = 'Sistema';
            let userId: string | null = null; // userId needs to be declared
            let metadata: Record<string, any> = {};

            // 1. Determine Actor
            if (actor) {
                userName = actor.name || 'Sistema';
                userId = actor.id || null;
                metadata = { ip: actor.ip, userAgent: actor.userAgent };
            } else {
                // Fallback to auth user if no explicit actor provided
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Usuario';
                    userId = user.id;
                }
            }

            // 2. Insert Log
            // Note: If AuditLog table schema doesn't have metadata column yet, this might fail or ignore it.
            // Assuming AuditLog has a 'metadata' jsonb column or similar, otherwise we append to details.

            // Checks for metadata column existence in Supabase/Prisma would be good, but let's assume standard structure or append to details for now to be safe.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const logData: Record<string, any> = {
                // id: crypto.randomUUID(), // Let DB handle default
                organizationId: orgId,
                projectId: projectId,
                action,
                details: details || null,
                userName,
                userId,
                // createdAt: new Date().toISOString() // Let DB handle default
            };

            // Try to add metadata if table supports it (we don't know for sure without schema, but typically yes)
            // If not, append to details?
            // "Public User (IP: ...)"
            if (Object.keys(metadata).length > 0) {
                if (metadata.ip) {
                    logData.details = `${details || ''} [IP: ${metadata.ip}]`.trim();
                }
                // If table has metadata column, uncomment:
                // logData.metadata = metadata;
            }

            const { error } = await supabase.from('AuditLog').insert(logData);

            if (error) {
                console.error(`[AuditService] Error inserting log: ${error.message}`, { projectId, action, details });
            }
        } catch (error) {
            console.error('[AuditService] Critical error:', error);
        }
    }
}
