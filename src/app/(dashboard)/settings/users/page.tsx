import { createClient } from "@/lib/supabase/server";
import { Plus, Trash2, User, Mail, Clock } from "lucide-react";
import { inviteUser, deleteInvitation } from "@/app/actions/invitations";
import { UserListItem } from "@/components/settings/UserListItem";
import { deleteUser } from "@/app/actions/users";
import { InviteUserForm } from "@/components/settings/InviteUserForm";

export default async function UsersPage() {
    const supabase = await createClient();
    const { data: users } = await supabase.from('Profile').select('*').order('createdAt', { ascending: false });
    const { data: invitations } = await supabase.from('UserInvitation')
        .select('*')
        .is('acceptedAt', null)
        .gt('expiresAt', new Date().toISOString())
        .order('createdAt', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Usuarios</h2>
                    <p className="text-muted-foreground">Invita a miembros del equipo y administra sus accesos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Invite User Form */}
                <InviteUserForm />

                <div className="md:col-span-2 space-y-8">
                    {/* Pending Invitations */}
                    {invitations && invitations.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 flex items-center text-amber-600">
                                <Clock className="w-4 h-4 mr-2" />
                                Invitaciones Pendientes
                            </h3>
                            <div className="bg-amber-50/50 border border-amber-200 rounded-lg divide-y divide-amber-100">
                                {invitations.map((inv) => (
                                    <div key={inv.id} className="p-4 flex justify-between items-center">
                                        <div>
                                            <div className="font-medium text-amber-900">{inv.email}</div>
                                            <div className="text-xs text-amber-700">
                                                Rol: {inv.role} • Expira: {new Date(inv.expiresAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <form action={deleteInvitation.bind(null, inv.id)}>
                                            <button className="text-amber-600 hover:text-red-600 p-2 hover:bg-amber-100 rounded-full transition-colors" title="Cancelar invitación">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </form>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active Users */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Miembros del Equipo</h3>

                        {(!users || users.length === 0) ? (
                            <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                                <User className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                                <p className="text-muted-foreground">No hay usuarios registrados</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {users.map((user) => (
                                    <UserListItem key={user.id} user={user} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
