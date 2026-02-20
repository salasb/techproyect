'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function switchWorkspaceContext(orgId: string) {
    const cookieStore = await cookies()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'User not authenticated' }
    }

    try {
        const { getWorkspaceState } = await import('@/lib/auth/workspace-resolver')
        const workspace = await getWorkspaceState()

        // Validar que la organización existe
        const targetOrg = await prisma.organization.findUnique({
            where: { id: orgId },
            select: { id: true, name: true }
        })

        if (!targetOrg) {
            return { success: false, error: 'Organización no encontrada' }
        }

        // Si NO es superadmin, validamos la membresía
        if (!workspace.isSuperadmin) {
            const membership = await prisma.organizationMember.findFirst({
                where: {
                    userId: user.id,
                    organizationId: orgId
                }
            })
            if (!membership || membership.status !== 'ACTIVE') {
                return { success: false, error: 'No tienes acceso activo a esta organización' }
            }
        }

        // Auditar el cambio si es superadmin (o siempre)
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'WORKSPACE_CONTEXT_SWITCHED',
                details: `Contexto cambiado a: ${targetOrg.name} (${orgId}) por ${workspace.isSuperadmin ? 'SUPERADMIN' : 'USUARIO'}`,
                userName: user.email || 'Desconocido',
                organizationId: orgId
            }
        })

        // Set the cookie
        cookieStore.set('app-org-id', orgId, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        })

        // Update Profile DB
        await prisma.profile.update({
            where: { id: user.id },
            data: { organizationId: orgId }
        })

        return { success: true }

    } catch (e: any) {
        console.error("Error switching workspace context: ", e)
        return { success: false, error: e.message }
    }
}
