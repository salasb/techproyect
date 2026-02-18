"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { acceptInvitationAction } from "@/actions/team";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";

export function JoinOrganizationClient({ token, isAuthenticated, orgName }: any) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleJoin = () => {
        if (!isAuthenticated) {
            // Guardar token en localStorage o usar searchParams para volver tras login
            router.push(`/login?returnTo=/join?token=${token}`);
            return;
        }

        startTransition(async () => {
            try {
                const result = await acceptInvitationAction(token);
                if (result.success) {
                    toast.success(`¡Bienvenido a ${orgName}!`);
                    // Esperar un momento para que se procesen las cookies si es necesario
                    setTimeout(() => {
                        router.push("/dashboard");
                        router.refresh();
                    }, 1000);
                }
            } catch (e: any) {
                toast.error(e.message);
            }
        });
    };

    return (
        <div className="space-y-4">
            <Button
                className="w-full h-12 text-lg"
                onClick={handleJoin}
                disabled={isPending}
            >
                {isAuthenticated ? "Unirme ahora" : "Iniciar sesión para unirme"}
            </Button>

            {!isAuthenticated && (
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => router.push(`/signup?returnTo=/join?token=${token}`)}
                    >
                        <UserPlus className="mr-2 h-4 w-4" /> Crear cuenta
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => router.push(`/login?returnTo=/join?token=${token}`)}
                    >
                        <LogIn className="mr-2 h-4 w-4" /> Login
                    </Button>
                </div>
            )}

            <p className="text-xs text-center text-muted-foreground">
                Al unirte, aceptas los términos de servicio y políticas de privacidad.
            </p>
        </div>
    );
}
