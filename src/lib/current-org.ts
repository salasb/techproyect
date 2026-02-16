import { cookies } from 'next/headers'

export async function getOrganizationId() {
    const cookieStore = await cookies()
    const orgId = cookieStore.get('app-org-id')?.value
    return orgId || ''
}
