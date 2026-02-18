import prisma from "@/lib/prisma";

export type AuditEventType =
    | 'INVITE_SENT'
    | 'INVITE_ACCEPTED'
    | 'INVITE_REVOKED'
    | 'MEMBER_ROLE_CHANGED'
    | 'MEMBER_REMOVED'
    | 'ORG_MODE_CHANGED'
    | 'SUBSCRIPTION_UPDATED';

export async function createAuditLog({
    organizationId,
    userId,
    action,
    details,
    projectId = null,
    userName = null,
}: {
    organizationId: string;
    userId: string;
    action: AuditEventType;
    details: string;
    projectId?: string | null;
    userName?: string | null;
}) {
    try {
        return await prisma.auditLog.create({
            data: {
                organizationId,
                userId,
                action,
                details,
                projectId,
                userName,
            },
        });
    } catch (error) {
        console.error("Failed to create audit log:", error);
        // No bloqueamos el flujo principal si falla la auditoría, pero lo logueamos
    }
}
