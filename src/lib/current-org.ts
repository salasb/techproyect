import { cookies } from 'next/headers'

export async function getOrganizationId() {
    const cookieStore = await cookies()
    const orgId = cookieStore.get('app-org-id')?.value
    if (!orgId) {
        // Fallback or Error? 
        // For strict multi-tenancy, this is an error.
        // But for migration safety, maybe default?
        // No, strict. Middleware ensures cookie.
        throw new Error("Organization context missing")
    }
    return orgId
}
