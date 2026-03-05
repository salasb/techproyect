import { resolveSuperadminAccess } from "@/lib/auth/server-resolver";
import { UserPurgeService } from "@/services/user-purge-service";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * Purge Test Users Endpoint (v1.0)
 * POST /api/admin/auth/purge-test-users
 * Body: { pattern: string, dryRun: boolean, limit?: number }
 */
export async function POST(req: Request) {
    try {
        // 1. Hard Security Guard
        const access = await resolveSuperadminAccess();
        if (!access.ok) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const { pattern, dryRun, limit } = body;

        if (!pattern || pattern.length < 3) {
            return NextResponse.json({ error: "Pattern too short or invalid." }, { status: 400 });
        }

        // 2. Execute Purge Service
        const results = await UserPurgeService.purgeUsers(pattern, dryRun === true, limit || 10);

        return NextResponse.json({
            ok: true,
            dryRun: dryRun === true,
            summary: {
                total: results.length,
                success: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length
            },
            results
        });

    } catch (err: any) {
        console.error("[PURGE_API] Error:", err.message);
        return NextResponse.json({ 
            ok: false, 
            error: err.message,
            message: "No pudimos completar la operación de purga." 
        }, { status: 500 });
    }
}
