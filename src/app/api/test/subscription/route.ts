import { NextResponse } from "next/server";
import { checkSubscriptionLimit, getOrganizationSubscription } from "@/lib/subscriptions";
import { updateOrganizationPlan } from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    console.log("Starting Subscription Verification via API...");
    const results: string[] = [];

    try {
        // 1. Setup: Get a Test Org
        const supabase = await createClient();
        const { data: org } = await supabase.from('Organization').select('id, name').limit(1).single();

        if (!org) {
            return NextResponse.json({ error: "No organization found to test" }, { status: 404 });
        }

        const orgId = org.id;
        results.push(`Testing with Org: ${org.name} (${orgId})`);

        // 2. Set to FREE
        results.push("Action: Setting plan to FREE...");
        await updateOrganizationPlan(orgId, 'FREE');

        // 3. Check Limits
        const subFree = await getOrganizationSubscription(orgId);
        results.push(`[FREE] Max Users: ${subFree.limits.maxUsers}`);

        if (subFree.limits.maxUsers !== 1) {
            results.push("❌ FAIL: FREE limit should be 1");
        } else {
            results.push("✅ PASS: FREE limit is 1");
        }

        // 4. Upgrade to PRO
        results.push("Action: Upgrading to PRO...");
        await updateOrganizationPlan(orgId, 'PRO');

        // 5. Check Limits
        const subPro = await getOrganizationSubscription(orgId);
        results.push(`[PRO] Max Users: ${subPro.limits.maxUsers}`);

        if (subPro.limits.maxUsers !== 5) {
            results.push("❌ FAIL: PRO limit should be 5");
        } else {
            results.push("✅ PASS: PRO limit is 5");
        }

        // Restore to ENTERPRISE for dev/demo purposes if needed, or leave as PRO
        // Let's leave it as PRO to show the change in UI

        return NextResponse.json({
            success: true,
            logs: results
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            logs: results
        }, { status: 500 });
    }
}
