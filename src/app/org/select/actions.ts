'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function selectOrganization(orgId: string) {
    const cookieStore = await cookies()

    // Set the cookie
    cookieStore.set('app-org-id', orgId, {
        httpOnly: false, // consistency with middleware
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
    })

    redirect('/dashboard')
}
