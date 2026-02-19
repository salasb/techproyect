import prisma from "@/lib/prisma";

export class RateLimitService {
    /**
     * Checks if an action has exceeded the rate limit for a specific identifier (IP or User ID).
     * Uses Prisma Aggregate to count AuditLog entries.
     * 
     * @param identifier - IP address or User ID to check against.
     * @param action - The action string stored in AuditLog (e.g., 'INVOICE_PAYMENT').
     * @param limit - Max allowed actions in the window.
     * @param windowSeconds - Time window in seconds.
     * @returns Object containing success boolean and remaining quota.
     */
    static async check(
        identifier: string,
        action: string,
        limit: number,
        windowSeconds: number
    ): Promise<{ success: boolean; usage: number; remaining: number }> {
        const windowStart = new Date(Date.now() - windowSeconds * 1000);

        // We search for logs where:
        // 1. Action matches
        // 2. CreatedAt is within window
        // 3. EITHER userId matches identifier OR details contains identifier (IP)
        // Note: Searching text in 'details' is slow for large tables, fine for current scale.

        try {
            const count = await prisma.auditLog.count({
                where: {
                    action: action,
                    createdAt: {
                        gte: windowStart
                    },
                    OR: [
                        { userId: identifier },
                        { details: { contains: identifier } }
                    ]
                }
            });

            const usage = count;
            const remaining = Math.max(0, limit - usage);

            return {
                success: usage < limit,
                usage,
                remaining
            };
        } catch (error) {
            console.error("RateLimitService Check Error:", error);
            // Fail open to avoid blocking legit users on DB error, but log it.
            return { success: true, usage: 0, remaining: limit };
        }
    }
}
