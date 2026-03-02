import { requireOperationalScope } from "@/lib/auth/server-resolver";
import { getRolePermissions, Permission } from "@/lib/auth/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Check, X, Info } from "lucide-react";
import { MembershipRole } from "@prisma/client";

export default async function RolesPermissionsPage() {
    const scope = await requireOperationalScope();

    const roles: MembershipRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
    const allPermissions: { id: Permission, label: string, desc: string }[] = [
        { id: 'BILLING_MANAGE', label: 'Gestionar Facturación', desc: 'Cambiar planes, métodos de pago y ver suscripción.' },
        { id: 'FINANCE_VIEW', label: 'Ver Finanzas', desc: 'Ver facturas, pagos y reportes financieros.' },
        { id: 'QUOTES_MANAGE', label: 'Gestionar Cotizaciones', desc: 'Crear, editar y enviar cotizaciones comerciales.' },
        { id: 'PROJECTS_MANAGE', label: 'Gestionar Proyectos', desc: 'Crear y administrar proyectos operativos.' },
        { id: 'TEAM_MANAGE', label: 'Gestionar Equipo', desc: 'Invitar, remover y cambiar roles de miembros.' },
        { id: 'SUPPORT_MANAGE', label: 'Gestionar Soporte', desc: 'Crear y responder tickets de ayuda técnica.' },
        { id: 'CRM_MANAGE', label: 'Gestionar CRM', desc: 'Administrar clientes, contactos e interacciones.' },
        { id: 'INVENTORY_MANAGE', label: 'Gestionar Inventario', desc: 'Controlar stock, movimientos y proveedores.' },
    ];

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20">
            <div>
                <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase italic">Roles y Permisos (RBAC v1)</h2>
                <p className="text-muted-foreground font-medium italic underline decoration-indigo-500/20 underline-offset-8">Definición de capacidades por rol dentro de tu organización.</p>
            </div>

            <div className="grid grid-cols-1 gap-10">
                <Card className="rounded-[2.5rem] shadow-sm border-border/50 overflow-hidden">
                    <CardHeader className="p-8 border-b border-border/50 bg-muted/5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                                Matriz de Capacidades B2B
                            </CardTitle>
                            <Badge variant="outline" className="text-[8px] font-black uppercase border-indigo-200 text-indigo-600 bg-indigo-50 tracking-widest">Enterprise Ready</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/5 border-b border-border/50">
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Permiso / Recurso</th>
                                    {roles.map(role => (
                                        <th key={role} className="p-6 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[10px] font-black uppercase tracking-tighter text-foreground">{role}</span>
                                                {role === 'OWNER' && <div className="w-1 h-1 rounded-full bg-indigo-500" />}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {allPermissions.map((perm) => (
                                    <tr key={perm.id} className="group hover:bg-muted/5 transition-colors">
                                        <td className="p-6">
                                            <div className="space-y-1">
                                                <p className="font-bold text-sm tracking-tight text-foreground">{perm.label}</p>
                                                <p className="text-[10px] text-muted-foreground italic font-medium">{perm.desc}</p>
                                            </div>
                                        </td>
                                        {roles.map(role => {
                                            const hasPerm = getRolePermissions(role).includes(perm.id);
                                            return (
                                                <td key={`${role}-${perm.id}`} className="p-6 text-center">
                                                    <div className="flex justify-center">
                                                        {hasPerm ? (
                                                            <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                                                                <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center opacity-20">
                                                                <X className="w-3 h-3 text-zinc-400 stroke-[3]" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Legend / Info */}
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-[2rem] p-8 flex items-start gap-6">
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm shrink-0">
                        <Info className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-blue-900 dark:text-blue-300 font-black uppercase text-xs tracking-[0.2em]">Acerca de los Roles</h4>
                        <p className="text-blue-700 dark:text-blue-400 text-sm leading-relaxed font-medium italic">
                            Los permisos son fijos por rol en esta versión. Si necesitas una configuración personalizada (Custom Roles), por favor contacta a soporte para activar el módulo Enterprise.
                        </p>
                        <div className="pt-4">
                            <Badge variant="outline" className="border-blue-200 text-blue-700 bg-white text-[9px] font-bold uppercase">Security Policy v1.0</Badge>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
