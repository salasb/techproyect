import { createClient } from "@/lib/supabase/server";
import { Plus, Trash2, User } from "lucide-react";
import { createUser, deleteUser } from "@/app/actions/users";

export default async function UsersPage() {
    const supabase = await createClient();
    const { data: users } = await supabase.from('Profile').select('*').order('createdAt', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Usuarios</h2>
                    <p className="text-muted-foreground">Administra los miembros del equipo y sus accesos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Create User Form */}
                <div className="bg-card border border-border rounded-xl p-6 h-fit">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Usuario
                    </h3>
                    <form action={createUser} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Nombre Completo</label>
                            <input
                                name="name"
                                required
                                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Correo Electrónico</label>
                            <input
                                name="email"
                                type="email"
                                required
                                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                                placeholder="juan@empresa.com"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Rol</label>
                            <select
                                name="role"
                                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                            >
                                <option value="USER">Usuario</option>
                                <option value="ADMIN">Administrador</option>
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                            Crear Usuario
                        </button>
                    </form>
                </div>

                {/* Users List */}
                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold">Miembros del Equipo</h3>

                    {(!users || users.length === 0) ? (
                        <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                            <User className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                            <p className="text-muted-foreground">No hay usuarios registrados</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {users.map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-shadow">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-foreground">{user.name}</h4>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full uppercase ${user.role === 'ADMIN'
                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                                            }`}>
                                            {user.role}
                                        </span>
                                        <form action={deleteUser.bind(null, user.id)}>
                                            <button className="text-muted-foreground hover:text-red-500 transition-colors p-2">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
