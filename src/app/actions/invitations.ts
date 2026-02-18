'use server'

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/current-org";
import { ActivationService } from "@/services/activation-service";

export async function inviteUser(formData: FormData) {
    const orgId = await getOrganizationId();

    // 0. Check Subscription Limits
    const { checkSubscriptionLimit } = await import("@/lib/subscriptions");
    const limitCheck = await checkSubscriptionLimit(orgId, 'users');
    if (!limitCheck.allowed) {
        throw new Error(limitCheck.message);
    }

    const email = formData.get("email") as string;
    const role = formData.get("role") as string || 'USER';

    if (!email) {
        throw new Error("Email is required");
    }

    const supabase = await createClient();

    // 1. Check if user already exists in Profile (optional, but good UX)
    const { data: existingProfile } = await supabase
        .from('Profile')
        .select('id')
        .eq('email', email)
        .single();

    if (existingProfile) {
        throw new Error("User already exists in the system.");
    }

    // 2. Create Invitation
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { error } = await supabase
        .from('UserInvitation')
        .insert({
            organizationId: orgId,
            email,
            role,
            token,
            expiresAt: expiresAt.toISOString()
        });

    if (error) {
        // Handle unique constraint violation (already invited)
        if (error.code === '23505') {
            throw new Error("User already has a pending invitation.");
        }
        throw new Error(`Error creating invitation: ${error.message}`);
    }

    // [Activation] Track Milestone
    await ActivationService.trackFirst('FIRST_TEAM_INVITE_SENT', orgId);

    // 3. Mock Email Sending (In production, use Resend/SendGrid)
    // For now, we will return the link to be shown in the UI (Dev DX)
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/register?token=${token}`;
    console.log(`[DEV] Invite Link for ${email}: ${inviteLink}`);

    revalidatePath("/settings/users");

    return { success: true, message: "Invitation created", debugLink: inviteLink };
}

export async function deleteInvitation(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('UserInvitation')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Error deleting invitation: ${error.message}`);
    }

    revalidatePath("/settings/users");
}
