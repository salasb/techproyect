'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ORG_CONTEXT_COOKIE } from '@/lib/auth/constants'

export async function selectOrganization(orgId: string) {
    const cookieStore = await cookies()

    // Set the cookie
    cookieStore.set(ORG_CONTEXT_COOKIE, orgId, {
        httpOnly: true, // consistency with middleware
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
    })

    // Update Profile DB
    const { createClient } = await import('@/lib/supabase/server');
    const prisma = (await import('@/lib/prisma')).default;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        try {
            await prisma.profile.update({
                where: { id: user.id },
                data: { organizationId: orgId }
            });
        } catch (e) {
            console.error("Error setting profile active orgid: ", e);
        }
    }

    redirect('/dashboard')
}
