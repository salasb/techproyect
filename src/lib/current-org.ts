import { cookies } from 'next/headers'
import { ORG_CONTEXT_COOKIE } from './auth/constants'

export async function getOrganizationId() {
    const cookieStore = await cookies()
    const orgId = cookieStore.get(ORG_CONTEXT_COOKIE)?.value
    return orgId || ''
}
