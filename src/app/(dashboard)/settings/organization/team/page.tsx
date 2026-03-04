import { requirePermission } from "@/lib/auth/server-resolver";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Mail, Shield, UserPlus, Trash2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { inviteMemberAction, removeMemberAction, updateMemberRoleAction } from "@/actions/team";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function TeamSettingsPage() {
    const scope = await requirePermission('TEAM_MANAGE');
    const orgId = scope.orgId;

    const [members, invitations, customRoles] = await Promise.all([
        prisma.organizationMember.findMany({
            where: { organizationId: orgId },
            include: { profile: true, customRole: true }
        }),
        prisma.userInvitation.findMany({
            where: { organizationId: orgId, status: 'PENDING' }
        }),
        prisma.customRole.findMany({
            where: { organizationId: orgId }
        })
    ]);

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Configuración</span>
                    </div>
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase">Equipo de Trabajo</h1>
                    <p className="text-muted-foreground font-medium italic underline decoration-blue-500/20 underline-offset-8">Gestiona el acceso y permisos de tus colaboradores.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Invite Section */}
                <div className="lg:col-span-1">
                    <Card className="rounded-[2.5rem] border-slate-100 dark:border-zinc-800 shadow-xl overflow-hidden sticky top-24">
                        <CardHeader className="p-8 pb-4 bg-slate-50 dark:bg-zinc-800/50 border-b border-border/50">
                            <div className="flex items-center gap-3 mb-2">
                                <UserPlus className="w-5 h-5 text-blue-600" />
                                <CardTitle className="text-lg font-black uppercase italic tracking-tight">Invitar Miembro</CardTitle>
                            </div>
                            <CardDescription className="text-[11px] font-medium italic">Se enviará un correo con el link de acceso.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <form action={async (fd) => {
                                'use server';
                                await inviteMemberAction(fd);
                            }} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest ml-1">Correo Electrónico</Label>
                                    <Input id="email" name="email" type="email" placeholder="ejemplo@empresa.com" required className="rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role" className="text-[10px] font-black uppercase tracking-widest ml-1">Rol Inicial</Label>
                                    <select name="role" className="w-full h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" defaultValue="MEMBER">
                                        <option value="MEMBER">Miembro (Operativo)</option>
                                        <option value="ADMIN">Administrador (Gestión)</option>
                                        <option value="VIEWER">Observador (Solo lectura)</option>
                                        {customRoles.map(cr => (
                                            <option key={cr.id} value={cr.id}>{cr.name} (Custom)</option>
                                        ))}
                                    </select>
                                </div>
                                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase italic text-xs tracking-widest h-12 shadow-lg shadow-blue-900/20">
                                    Enviar Invitación
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="rounded-[2.5rem] border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-border/50 flex items-center justify-between bg-white dark:bg-zinc-900">
                            <h3 className="font-black uppercase italic tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                <Shield className="w-4 h-4 text-emerald-500" /> Miembros Activos
                            </h3>
                            <Badge variant="outline" className="font-black">{members.length} personas</Badge>
                        </div>
                        <div className="divide-y divide-border/50">
                            {members.map((member) => (
                                <div key={member.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-700 flex items-center justify-center font-black text-xs text-slate-500 border border-slate-200 uppercase">
                                            {member.profile.name.substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-slate-900 dark:text-white uppercase">{member.profile.name}</p>
                                            <p className="text-[11px] text-slate-400 italic">{member.profile.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge variant="secondary" className="text-[9px] font-black uppercase px-2 py-0.5 tracking-tighter">
                                            {member.customRole?.name || member.role}
                                        </Badge>
                                        {member.role !== 'OWNER' && (
                                            <form action={async (fd) => {
                                                'use server';
                                                await removeMemberAction(member.id, orgId);
                                            }}>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 hover:text-rose-600 transition-colors rounded-lg">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {invitations.length > 0 && (
                        <Card className="rounded-[2.5rem] border-amber-100 dark:border-amber-900/30 bg-amber-50/20 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-amber-100/50 flex items-center justify-between">
                                <h3 className="font-black uppercase italic tracking-tight text-amber-900 dark:text-amber-100 flex items-center gap-2 text-xs">
                                    <Mail className="w-4 h-4" /> Invitaciones Pendientes
                                </h3>
                            </div>
                            <div className="divide-y divide-amber-100/50">
                                {invitations.map((inv) => (
                                    <div key={inv.id} className="p-6 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-sm text-amber-900 dark:text-amber-100">{inv.email}</p>
                                            <p className="text-[10px] text-amber-700/60 uppercase font-black tracking-widest italic">{inv.role} • Expira {inv.expiresAt.toLocaleDateString()}</p>
                                        </div>
                                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[9px] font-black uppercase">Pendiente</Badge>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
