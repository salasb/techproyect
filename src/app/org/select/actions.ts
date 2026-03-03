'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ORG_CONTEXT_COOKIE } from '@/lib/auth/constants'

export async function selectOrganization(orgId: string) {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const { setActiveOrg } = await import('@/lib/auth/active-context');
        await setActiveOrg(user.id, orgId, "select");
    }

    redirect('/dashboard')
}
