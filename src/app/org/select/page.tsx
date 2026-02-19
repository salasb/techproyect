import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { selectOrganization } from './actions'

export default async function SelectOrgPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return redirect('/login')

    const { data: memberships } = await supabase
        .from('OrganizationMember')
        .select('*, organization:Organization(*)')
        .eq('userId', user.id)
        .eq('status', 'ACTIVE')

    if (!memberships || memberships.length === 0) {
        return redirect('/start')
    }

    // Identify user name
    const { data: profile } = await supabase.from('Profile').select('name').eq('id', user.id).single()

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        Selecciona una Organización
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Hola, {profile?.name || 'Usuario'}. Tienes acceso a múltiples organizaciones.
                    </p>
                </div>

                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <div className="space-y-4">
                        {memberships.map((member: any) => (
                            <form key={member.organizationId} action={async () => {
                                'use server'
                                await selectOrganization(member.organizationId)
                            }}>
                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                >
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg overflow-hidden">
                                            {member.organization.logoUrl ? (
                                                <img src={member.organization.logoUrl} alt={member.organization.name} className="h-full w-full object-cover" />
                                            ) : (
                                                member.organization.name[0]?.toUpperCase()
                                            )}
                                        </div>
                                        <div className="ml-4 text-left">
                                            <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                                                {member.organization.name}
                                            </p>
                                            <p className="text-xs text-gray-500 capitalize">
                                                Rol: {member.role.toLowerCase()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="ml-4 flex-shrink-0">
                                        <span className="text-blue-600 group-hover:block hidden text-sm font-medium">Entrar &rarr;</span>
                                    </div>
                                </button>
                            </form>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <p className="text-xs text-gray-500">
                            ¿No encuentras tu organización? <a href="/start" className="text-blue-600 hover:underline">Crea una nueva</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
