import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const adminToken = request.headers.get('x-admin-token');
        const expectedToken = process.env.SUPERADMIN_BOOTSTRAP_TOKEN;

        if (!adminToken || !expectedToken || adminToken !== expectedToken) {
            return NextResponse.json({ error: "Forbidden: Invalid token or not configured" }, { status: 403 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized: No active session" }, { status: 401 });
        }

        if (process.env.SUPERADMIN_BOOTSTRAP_ENABLED !== 'true') {
            return NextResponse.json({ error: "Forbidden: Bootstrap mechanism is disabled by env flag" }, { status: 403 });
        }

        const allowlist = process.env.SUPERADMIN_ALLOWLIST?.split(',').filter(Boolean).map(e => e.trim().toLowerCase()) || [];
        if (!user.email || !allowlist.includes(user.email.toLowerCase())) {
            return NextResponse.json({ error: "Forbidden: User email not in superadmin allowlist" }, { status: 403 });
        }

        // Promote to SUPERADMIN
        const profile = await prisma.profile.update({
            where: { id: user.id },
            data: { role: 'SUPERADMIN' }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'SUPERADMIN_BOOTSTRAPPED',
                details: `User ${user.email} bootstrapped to Superadmin via API`,
                userName: profile.name
            }
        });

        return NextResponse.json({
            success: true,
            message: `User ${user.email} successfully promoted to SUPERADMIN`,
            role: profile.role
        });

    } catch (error: any) {
        console.error('[BootstrapSuperadmin] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
