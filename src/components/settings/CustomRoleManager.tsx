"use client";

import React, { useState } from "react";
import { createCustomRoleAction, updateCustomRoleAction, deleteCustomRoleAction } from "@/actions/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Plus, Trash2, Edit2, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Permission } from "@/lib/auth/rbac";

const ALL_PERMISSIONS: { id: Permission, label: string, desc: string }[] = [
    { id: 'BILLING_MANAGE', label: 'Gestionar Facturación', desc: 'Suscripciones y pagos.' },
    { id: 'FINANCE_VIEW', label: 'Ver Finanzas', desc: 'Lectura de facturas y cobros.' },
    { id: 'QUOTES_MANAGE', label: 'Gestionar Cotizaciones', desc: 'Crear y enviar cotizaciones.' },
    { id: 'PROJECTS_MANAGE', label: 'Gestionar Proyectos', desc: 'Operación de proyectos activos.' },
    { id: 'TEAM_MANAGE', label: 'Gestionar Equipo', desc: 'Invitar miembros y asignar roles.' },
    { id: 'SUPPORT_MANAGE', label: 'Gestionar Soporte', desc: 'Interactuar con Support Desk.' },
    { id: 'CRM_MANAGE', label: 'Gestionar CRM', desc: 'Clientes y prospectos.' },
    { id: 'INVENTORY_MANAGE', label: 'Gestionar Inventario', desc: 'Control de stock.' },
];

const TEMPLATES: Record<string, { name: string, perms: Permission[] }> = {
    FINANCE: { name: 'Finanzas', perms: ['FINANCE_VIEW', 'BILLING_MANAGE'] },
    SALES: { name: 'Ventas', perms: ['QUOTES_MANAGE', 'CRM_MANAGE', 'FINANCE_VIEW'] },
    SUPPORT: { name: 'Soporte', perms: ['SUPPORT_MANAGE', 'PROJECTS_MANAGE'] },
    OPERATIONS: { name: 'Operaciones', perms: ['PROJECTS_MANAGE', 'INVENTORY_MANAGE', 'CRM_MANAGE'] },
};

export function CustomRoleManager({ initialRoles }: { initialRoles: any[] }) {
    const [roles, setRoles] = useState(initialRoles);
    const [editingRole, setEditingRole] = useState<any | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);

    const openCreateForm = () => {
        setEditingRole(null);
        setSelectedPermissions([]);
        setIsFormOpen(true);
    };

    const openEditForm = (role: any) => {
        setEditingRole(role);
        setSelectedPermissions(role.permissions);
        setIsFormOpen(true);
    };

    const applyTemplate = (key: string) => {
        const template = TEMPLATES[key];
        if (template) {
            setSelectedPermissions(template.perms);
            toast.info(`Plantilla "${template.name}" aplicada.`);
        }
    };

    const togglePermission = (perm: Permission) => {
        setSelectedPermissions(prev => 
            prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
        );
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        // Add permissions explicitly since we manage them in state now
        selectedPermissions.forEach(p => formData.append('permissions', p));

        try {
            if (editingRole) {
                await updateCustomRoleAction(editingRole.id, formData);
                toast.success("Rol actualizado con éxito");
            } else {
                await createCustomRoleAction(formData);
                toast.success("Rol creado con éxito");
            }
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message);
            setLoading(false);
        }
    };

    const handleDelete = async (roleId: string) => {
        if (!confirm("¿Eliminar este rol? Los usuarios asignados pasarán a ser 'Miembros' estándar.")) return;
        try {
            await deleteCustomRoleAction(roleId);
            setRoles(prev => prev.filter(r => r.id !== roleId));
            toast.success("Rol eliminado");
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <div className="space-y-6">
            {!isFormOpen && (
                <div className="flex justify-end">
                    <Button onClick={openCreateForm} className="rounded-xl font-bold text-xs uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-2" /> Crear Rol Personalizado
                    </Button>
                </div>
            )}

            {isFormOpen && (
                <div className="bg-muted/5 border border-border/50 rounded-[2rem] p-8 space-y-6 shadow-sm mb-8 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                        <Shield className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-black text-lg uppercase tracking-tight">{editingRole ? 'Editar Rol' : 'Nuevo Rol Personalizado'}</h3>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nombre del Rol</Label>
                                <Input name="name" defaultValue={editingRole?.name} required placeholder="Ej: Gerente Comercial" className="rounded-xl border-border bg-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Descripción (Opcional)</Label>
                                <Input name="description" defaultValue={editingRole?.description} placeholder="Ej: Acceso total a cotizaciones y proyectos" className="rounded-xl border-border bg-white" />
                            </div>
                        </div>

                        {/* Template Selector */}
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Usar Plantilla Rápida</Label>
                            <div className="flex flex-wrap gap-2">
                                {Object.keys(TEMPLATES).map(key => (
                                    <Button 
                                        key={key} 
                                        type="button" 
                                        variant="outline" 
                                        size="sm" 
                                        className="rounded-full text-[9px] font-black uppercase tracking-widest border-indigo-100 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                        onClick={() => applyTemplate(key)}
                                    >
                                        {TEMPLATES[key].name}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Permisos Asignados</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                {ALL_PERMISSIONS.map(perm => {
                                    const isChecked = selectedPermissions.includes(perm.id);
                                    return (
                                        <label 
                                            key={perm.id} 
                                            className={cn(
                                                "flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                                                isChecked ? "border-indigo-500 bg-indigo-50/30" : "border-border bg-white hover:border-indigo-300"
                                            )}
                                        >
                                            <input 
                                                type="checkbox" 
                                                checked={isChecked}
                                                onChange={() => togglePermission(perm.id)}
                                                className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                                            />
                                            <div className="space-y-0.5">
                                                <span className={cn("text-[10px] font-bold uppercase tracking-tight block", isChecked ? "text-indigo-900" : "text-foreground")}>{perm.label}</span>
                                                <span className="text-[9px] text-muted-foreground italic leading-tight block">{perm.desc}</span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
                            <Button type="button" variant="ghost" className="rounded-xl text-[10px] font-bold uppercase tracking-widest text-muted-foreground" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={loading} className="rounded-xl px-8 bg-indigo-600 hover:bg-indigo-700 font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Rol'}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.length === 0 && !isFormOpen && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-[2rem] bg-muted/5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">No hay roles personalizados. Se usan los roles estándar.</p>
                    </div>
                )}
                
                {roles.map(role => (
                    <div key={role.id} className="border border-border/50 rounded-[2rem] bg-white dark:bg-zinc-900 shadow-sm p-6 space-y-6 group hover:border-indigo-500/30 transition-all flex flex-col">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h4 className="font-black text-lg tracking-tight uppercase">{role.name}</h4>
                                {role.description && <p className="text-[10px] text-muted-foreground italic mt-1">{role.description}</p>}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600" onClick={() => openEditForm(role)}>
                                    <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(role.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3">Permisos ({role.permissions.length})</p>
                            <div className="flex flex-wrap gap-1.5">
                                {role.permissions.map((p: string) => (
                                    <Badge key={p} variant="secondary" className="text-[8px] font-mono px-1.5 py-0 bg-muted/50 border-border/50">{p}</Badge>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border/50 flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                            <span>{role._count?.members || 0} Usuarios</span>
                            <span>{role._count?.invitations || 0} Invitaciones</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
