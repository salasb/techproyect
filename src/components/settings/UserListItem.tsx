'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database } from "@/types/supabase";
import { deleteUser, updateUser } from "@/app/actions/users";
import { format } from "date-fns";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Profile = Database['public']['Tables']['Profile']['Row'];

export function UserListItem({ user }: { user: Profile }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editedName, setEditedName] = useState(user.name);
    const [editedRole, setEditedRole] = useState(user.role || 'USER');

    const router = useRouter();
    const { toast } = useToast();

    // Reset when user changes
    if (!isEditing && editedName !== user.name) {
        setEditedName(user.name);
    }

    async function handleSave() {
        if (!editedName.trim()) {
            toast({ type: "error", message: "El nombre no puede estar vacío" });
            return;
        }

        setIsSaving(true);
        try {
            await updateUser(user.id, {
                name: editedName,
                role: editedRole
            });
            toast({ type: "success", message: "Usuario actualizado" });
            setIsEditing(false);
            router.refresh(); // Refresh to show changes immediately
            // Dispatch event to update Header
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('user-profile-updated'));
            }
        } catch (error: any) {
            toast({ type: "error", message: error.message || "Error al actualizar" });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-shadow">
            <div className="flex items-center space-x-4 flex-1">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                </div>

                {isEditing ? (
                    <div className="flex-1 max-w-sm flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                        <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-input rounded bg-background"
                            placeholder="Nombre del usuario"
                            autoFocus
                        />
                        <select
                            value={editedRole}
                            onChange={(e) => setEditedRole(e.target.value)}
                            className="text-xs px-2 py-1 border border-input rounded bg-background"
                        >
                            <option value="USER">Usuario</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>
                ) : (
                    <div>
                        <h4 className="font-medium text-foreground">{user.name}</h4>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                )}
            </div>

            <div className="flex items-center space-x-2 pl-4">
                {!isEditing && (
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full uppercase ${user.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                        {user.role}
                    </span>
                )}

                {isEditing ? (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                            title="Guardar"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                setEditedName(user.name);
                                setEditedRole(user.role || 'USER');
                            }}
                            disabled={isSaving}
                            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Cancelar"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg transition-colors"
                            title="Editar"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <form action={deleteUser.bind(null, user.id)}>
                            <button className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}
