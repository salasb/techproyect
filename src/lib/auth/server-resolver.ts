import { createClient } from "@/lib/supabase/server";
import { resolveActiveOrganization as coreResolve } from "./organization-resolver";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Resolves the active organization for Server Components and Server Actions.
 * If no active organization is found, it redirects to /start or /org/select.
 * Returns the Organization ID directly.
 */
export async function resolveActiveOrganization() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const cookieStore = await cookies();
    const orgIdFromCookie = cookieStore.get('app-org-id')?.value;

    const resolution = await coreResolve(supabase, user.id, orgIdFromCookie);

    if (resolution.action === 'ENTER') {
        return resolution.organizationId;
    }

    if (resolution.action === 'SELECT') {
        redirect('/org/select');
    }

    // Action START
    redirect('/start');
}
