import { ShieldAlert } from "lucide-react";
import prisma from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { getOrganizationId } from "@/lib/current-org";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isOwner } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { TeamMemberList } from "@/components/team/member-list";
import { TeamInvitationList } from "@/components/team/invitation-list";
import { InviteMemberForm } from "@/components/team/invite-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function TeamSettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const orgId = await getOrganizationId();
    if (!orgId) redirect("/dashboard");

    // 1. Get current member and validate permissions
    const currentMember = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
        include: { organization: true }
    });

    if (!currentMember || !isAdmin(currentMember.role)) {
        redirect("/dashboard"); // Only admins can see this
    }

    // 2. Fetch members and invitations
    const members = await prisma.organizationMember.findMany({
        where: { organizationId: orgId },
        include: {
            profile: true
        },
        orderBy: { createdAt: 'asc' }
    });

    const invitations = await prisma.userInvitation.findMany({
        where: {
            organizationId: orgId,
            status: 'PENDING',
            expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' }
    });

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { subscription: true }
    });

    const isUserOwner = isOwner(currentMember.role);
    const seatsUsed = members.filter((m: any) => m.status === 'ACTIVE').length;

    // v1.1 Activation Check: Lack of Admins
    const adminCount = members.filter(m => isAdmin(m.role)).length;
    const hasNoAdmins = adminCount === 0;

    // Seat Limit Logic
    let maxSeats = 1;
    if (org?.mode === 'SOLO') {
        maxSeats = 1;
    } else if (org?.subscription) {
        maxSeats = org.subscription.seatLimit || 1;
    } else {
        maxSeats = (org?.plan as any) === 'PRO' ? 10 : 1;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Equipo</h1>
                    <p className="text-muted-foreground">
                        Administra los miembros de tu organización y sus permisos.
                    </p>
                </div>
                {hasNoAdmins && (
                    <Badge variant="destructive" className="animate-pulse py-1 px-4 text-[10px] font-black uppercase tracking-widest h-fit">
                        Crítico: Sin Administradores
                    </Badge>
                )}
            </div>

            {hasNoAdmins && (
                <Card className="border-rose-200 bg-rose-50/50 shadow-sm animate-in zoom-in duration-300">
                    <CardContent className="p-6 flex items-start gap-4">
                        <div className="p-3 bg-rose-100 rounded-2xl text-rose-600">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-black text-rose-900 uppercase text-xs tracking-widest">Atención Requerida</h3>
                            <p className="text-sm text-rose-700 leading-relaxed font-medium">
                                Esta organización no tiene administradores locales asignados. 
                                <span className="block mt-1 font-bold">Por favor, promueve al menos a un miembro a rol ADMIN o OWNER para asegurar la continuidad operativa.</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-4">
                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle>Miembros e Invitaciones</CardTitle>
                        <CardDescription>
                            Gestiona quién tiene acceso a {currentMember.organization.name}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="members">
                            <TabsList className="mb-4">
                                <TabsTrigger value="members">Miembros ({members.length})</TabsTrigger>
                                <TabsTrigger value="invitations">Invitaciones Pendientes ({invitations.length})</TabsTrigger>
                            </TabsList>

                            <TabsContent value="members">
                                <TeamMemberList
                                    members={members}
                                    currentUserId={user.id}
                                    isOwner={isUserOwner}
                                    orgId={orgId}
                                />
                            </TabsContent>

                            <TabsContent value="invitations">
                                <TeamInvitationList
                                    invitations={invitations}
                                    orgId={orgId}
                                />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Invitar Miembro</CardTitle>
                            <CardDescription>
                                Se enviará un link de acceso.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <InviteMemberForm
                                orgId={orgId}
                                canInvite={seatsUsed < maxSeats}
                                orgMode={currentMember.organization.mode}
                            />
                            {seatsUsed >= maxSeats && (
                                <p className="text-xs text-destructive mt-2">
                                    Límite de asientos alcanzado ({seatsUsed}/{maxSeats}).
                                    Mejora tu plan para añadir más.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Uso de Asientos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between mb-2">
                                <span className="text-2xl font-bold">{seatsUsed}</span>
                                <span className="text-muted-foreground text-sm">de {maxSeats}</span>
                            </div>
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mb-4">
                                <div
                                    className={`h-full ${seatsUsed >= maxSeats ? 'bg-destructive' : 'bg-primary'}`}
                                    style={{ width: `${Math.min(100, (seatsUsed / maxSeats) * 100)}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Para aumentar los asientos disponibles,{" "}
                                <a href="/settings/billing" className="text-primary hover:underline font-medium">
                                    gestiona tu suscripción aquí
                                </a>.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
