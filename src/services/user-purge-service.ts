import prisma from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSuperadminAccess } from "@/lib/auth/server-resolver";

export interface PurgeResult {
    userId: string;
    email: string;
    steps: string[];
    success: boolean;
    error?: string;
    traceId: string;
}

/**
 * UserPurgeService (v1.0)
 * Handles deep cleanup of test users across Auth, Database and Storage.
 */
export class UserPurgeService {
    
    private static ALLOWLIST = (process.env.SUPERADMIN_ALLOWLIST || '').toLowerCase().split(',');

    /**
     * Executes the purge logic for users matching a pattern.
     */
    static async purgeUsers(pattern: string, dryRun: boolean = true, limit: number = 10): Promise<PurgeResult[]> {
        const traceId = `PURGE-${Math.random().toString(36).substring(7).toUpperCase()}`;
        const supabase = createAdminClient();
        const results: PurgeResult[] = [];

        console.log(`[${traceId}] Starting purge. Pattern: ${pattern}, DryRun: ${dryRun}, Limit: ${limit}`);

        // 1. List users from Supabase Auth
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
            perPage: limit,
        });

        if (listError) throw new Error(`Failed to list users: ${listError.message}`);

        // 2. Filter by pattern and allowlist
        const candidates = users.filter(u => {
            const email = u.email?.toLowerCase() || '';
            const matchesPattern = email.includes(pattern.replace('*', ''));
            const isAllowlisted = this.ALLOWLIST.includes(email);
            return matchesPattern && !isAllowlisted;
        });

        console.log(`[${traceId}] Found ${candidates.length} candidates.`);

        for (const user of candidates) {
            const userTraceId = `${traceId}-${user.id.slice(0, 4)}`;
            const steps: string[] = [];
            let userSuccess = true;
            let userError = '';

            try {
                steps.push(`Candidate: ${user.email}`);

                if (!dryRun) {
                    // 3. Cleanup Relational Data (Prisma Transaction)
                    // We delete in order to satisfy FK constraints
                    await prisma.$transaction(async (tx) => {
                        steps.push("DB: Cleaning up ActiveContext...");
                        await tx.activeContext.deleteMany({ where: { userId: user.id } });

                        steps.push("DB: Cleaning up AuditLogs (User Ref)...");
                        await tx.auditLog.deleteMany({ where: { userId: user.id } });

                        steps.push("DB: Cleaning up OrganizationMemberships...");
                        await tx.organizationMember.deleteMany({ where: { userId: user.id } });

                        steps.push("DB: Cleaning up SupportMessages...");
                        await tx.supportMessage.deleteMany({ where: { userId: user.id } });

                        steps.push("DB: Cleaning up Profile...");
                        await tx.profile.deleteMany({ where: { id: user.id } });
                    });

                    // 4. Cleanup Storage (Optional/Conditional)
                    // Using raw SQL for storage.objects if necessary, or admin client
                    steps.push("Storage: Checking for owned objects...");
                    const { data: objects } = await supabase.storage.from('documents').list(user.id);
                    if (objects && objects.length > 0) {
                        steps.push(`Storage: Removing ${objects.length} objects...`);
                        await supabase.storage.from('documents').remove(objects.map(o => `${user.id}/${o.name}`));
                    }

                    // 5. Delete from Supabase Auth
                    steps.push("Auth: Deleting user from Supabase...");
                    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
                    if (deleteError) throw deleteError;

                    steps.push("Final: Purge complete.");
                } else {
                    steps.push("Dry Run: No data modified.");
                }

            } catch (err: any) {
                userSuccess = false;
                userError = err.message;
                console.error(`[${userTraceId}] Failed to purge user ${user.email}:`, err);
                
                // Bonus: Constraint detection
                if (err.message.includes('foreign key constraint')) {
                    userError = `Blocked by reference in other table. Check relations. (${err.message})`;
                }
            }

            results.push({
                userId: user.id,
                email: user.email || 'no-email',
                steps,
                success: userSuccess,
                error: userError,
                traceId: userTraceId
            });
        }

        return results;
    }
}
