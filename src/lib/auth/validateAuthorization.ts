import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/permissions";

export async function validateAuthorization(allowedRoles: string[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized: No user logged in");
    }

    const { data: profile } = await supabase
        .from('Profile')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile) {
        throw new Error("Unauthorized: Profile not found");
    }

    // Check if user role matches any of the allowed roles
    // We can reuse isAdmin if simplistic, but allowedRoles gives flexibility
    // Or just simple check:
    if (!allowedRoles.includes(profile.role)) {
        throw new Error("Unauthorized: Insufficient permissions");
    }

    return profile;
}
