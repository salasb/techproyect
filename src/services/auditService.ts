import { createClient } from "@/lib/supabase/server";

export class AuditService {
    static async logAction(projectId: string | null, action: string, details?: string) {
        try {
            const supabase = await createClient();

            // 1. Get Current User info
            const { data: { user } } = await supabase.auth.getUser();

            let userName = 'Sistema';
            let userId = null;

            if (user) {
                userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Usuario';
                userId = user.id;
            }

            // 2. Insert Log
            const { error } = await supabase.from('AuditLog').insert({
                projectId: projectId as any, // Can be null for system-wide actions if DB allows, otherwise map to a dummy system ID
                action,
                details: details || null,
                userName,
                userId,
                createdAt: new Date().toISOString()
            });

            if (error) {
                console.error(`[AuditService] Error inserting log: ${error.message}`, { projectId, action, details });
            }
        } catch (error) {
            console.error('[AuditService] Critical error:', error);
        }
    }
}
