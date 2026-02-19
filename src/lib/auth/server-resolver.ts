import { getWorkspaceState } from "./workspace-resolver";
import { redirect } from "next/navigation";

/**
 * Resolves the active organization for Server Components and Server Actions.
 * If no active organization is found, it may redirect or return null.
 */
export async function resolveActiveOrganization(): Promise<string> {
    const state = await getWorkspaceState();

    if (state.activeOrgId) {
        return state.activeOrgId;
    }

    if (state.error === 'Not authenticated') {
        redirect('/login');
    }

    // Fallback: This should ideally not be reached due to Auto-provisioning,
    // but if it is, we redirect to dashboard to trigger the Setup UI.
    redirect('/dashboard');
}
