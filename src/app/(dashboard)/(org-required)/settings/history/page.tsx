import { History, ShieldInfo } from "lucide-react";
import prisma from "@/lib/prisma";
import { getOrganizationId } from "@/lib/current-org";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlobalAuditLog } from "@/components/settings/GlobalAuditLog";

export default async function AuditHistoryPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const orgId = await getOrganizationId();
    if (!orgId) redirect("/dashboard");

    // 1. Get current member and validate permissions
    const currentMember = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId: user.id } }
    });

    if (!currentMember || !isAdmin(currentMember.role)) {
        redirect("/dashboard"); // Only admins can see this
    }

    // 2. Fetch logs for this organization
    const logs = await prisma.auditLog.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 100 // Limit to last 100 for performance
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Historial de Auditoría</h1>
                    <p className="text-muted-foreground">
                        Registro de eventos críticos y cambios de configuración en la organización.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <ShieldInfo className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">OWASP Compliant Logging</span>
                </div>
            </div>

            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5 text-zinc-400" />
                        Registro de Eventos
                    </CardTitle>
                    <CardDescription>
                        Visualiza quién, qué y cuándo se realizaron cambios importantes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <GlobalAuditLog logs={logs as any} />
                </CardContent>
            </Card>
        </div>
    );
}
