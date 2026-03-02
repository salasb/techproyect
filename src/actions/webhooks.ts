'use server'

import { requireOperationalScope, requirePermission } from "@/lib/auth/server-resolver";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

export async function createWebhookEndpointAction(formData: FormData) {
    const scope = await requirePermission('INTEGRATIONS_MANAGE');

    const url = formData.get("url") as string;
    const description = formData.get("description") as string;
    const events = formData.getAll("events") as string[];

    if (!url || !url.startsWith('http')) throw new Error("URL inválida");

    // Generate HMAC Secret
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const endpoint = await prisma.webhookEndpoint.create({
        data: {
            organizationId: scope.orgId,
            url,
            description,
            secret,
            events: events.length > 0 ? events : ['*']
        }
    });

    revalidatePath("/settings/integrations");
    return { success: true, secret }; // Return secret only ONCE at creation
}

export async function deleteWebhookEndpointAction(id: string) {
    const scope = await requirePermission('INTEGRATIONS_MANAGE');

    await prisma.webhookEndpoint.delete({
        where: { id, organizationId: scope.orgId }
    });

    revalidatePath("/settings/integrations");
    return { success: true };
}

export async function getWebhookLogsAction(endpointId: string) {
    const scope = await requireOperationalScope();
    
    return prisma.webhookLog.findMany({
        where: { endpoint: { id: endpointId, organizationId: scope.orgId } },
        orderBy: { createdAt: 'desc' },
        take: 50
    });
}
