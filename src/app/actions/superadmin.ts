'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { CockpitService } from '@/lib/superadmin/cockpit-service'

/**
 * Allows a Superadmin to safely enter an organization's context.
 * Logs the action for audit purposes.
 */
export async function enterOrganizationContext(orgId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Not authenticated")

    const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { role: true, name: true }
    })

    if (profile?.role !== 'SUPERADMIN') {
        throw new Error("Unauthorized: Superadmin access only")
    }

    // 1. Audit Switch
    await CockpitService.auditAdminAction(
        user.id,
        'SUPERADMIN_ORG_CONTEXT_ENTERED',
        `Superadmin entered context for organization ${orgId}`,
        orgId
    )

    // 2. Set Cookie
    const cookieStore = await cookies()
    cookieStore.set('app-org-id', orgId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
    })

    // 3. Update Profile fallback (optional but recommended for consistency)
    await prisma.profile.update({
        where: { id: user.id },
        data: { organizationId: orgId }
    })

    // 4. Redirect to dashboard with a clean state
    redirect('/dashboard')
}
