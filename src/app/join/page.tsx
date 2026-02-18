import prisma from "@/lib/prisma";
import { validateInvitation } from "@/services/invite-service";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JoinOrganizationClient } from "@/components/team/join-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function JoinPage({ searchParams }: { searchParams: { token?: string } }) {
    const token = searchParams.token;
    if (!token) redirect("/dashboard");

    // 1. Validate invitation early
    const invitation = await validateInvitation(token);
    if (!invitation) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle className="text-destructive">Invitación Inválida</CardTitle>
                        <CardDescription>
                            Este link ha expirado, ya fue utilizado o fue revocado por el administrador.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    // 2. Check auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If not logged in, we let them see the invitation but redirect to login before accepting
    const isAuthenticated = !!user;

    return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-muted/30">
            <Card className="max-w-md w-full shadow-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <span className="text-xl font-bold text-primary">
                            {invitation.organization.name.charAt(0)}
                        </span>
                    </div>
                    <CardTitle className="text-2xl">¡Te han invitado!</CardTitle>
                    <CardDescription>
                        {invitation.organization.name} te invita a unirte a su equipo como{" "}
                        <span className="font-semibold text-foreground">{invitation.role}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <JoinOrganizationClient
                        token={token}
                        isAuthenticated={isAuthenticated}
                        orgName={invitation.organization.name}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
