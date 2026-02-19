import prisma from "@/lib/prisma";
import { ShareLinkType, ShareLink } from "@prisma/client";
import { randomBytes, createHash } from "crypto";

export class ShareLinkService {
    /**
     * Create a secure share link for an entity.
     * Returns the full URL with the secret token (never stored in DB).
     */
    static async createLink(
        organizationId: string,
        entityType: ShareLinkType,
        entityId: string,
        createdByUserId: string,
        expiresInDays: number = 30
    ): Promise<string> {
        // 1. Generate secure random token (32 bytes -> 64 hex chars)
        const token = randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(token);

        // 2. Set expiration
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        // 3. Store metadata & hash
        // Check local rate limit: max 20 active links per org per day? (Simplified for now)

        await prisma.shareLink.create({
            data: {
                organizationId,
                entityType,
                entityId,
                tokenHash,
                createdByUserId,
                expiresAt,
            }
        });

        // 4. Return full URL
        // Detect base URL from env or default
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const path = entityType === 'QUOTE' ? 'q' : 'i';

        return `${baseUrl}/p/${path}/${token}`;
    }

    /**
     * Verify a token and return the associated entity context.
     * Handles expiration, revocation, and access logging.
     */
    static async verifyLink(token: string): Promise<{
        isValid: boolean;
        error?: 'INVALID' | 'EXPIRED' | 'REVOKED';
        link?: ShareLink
    }> {
        const tokenHash = this.hashToken(token);

        const link = await prisma.shareLink.findUnique({
            where: { tokenHash },
            include: { organization: true }
        });

        if (!link) {
            return { isValid: false, error: 'INVALID' };
        }

        if (link.revokedAt) {
            return { isValid: false, error: 'REVOKED', link };
        }

        if (new Date() > link.expiresAt) {
            return { isValid: false, error: 'EXPIRED', link };
        }

        // Async log access (fire and forget to not block UI)
        await prisma.shareLink.update({
            where: { id: link.id },
            data: {
                accessCount: { increment: 1 },
                lastAccessAt: new Date()
            }
        });

        return { isValid: true, link };
    }

    /**
     * Revoke a specific link.
     */
    static async revokeLink(linkId: string) {
        return prisma.shareLink.update({
            where: { id: linkId },
            data: { revokedAt: new Date() }
        });
    }

    /**
     * Rotate a link: Revoke old one, create new one.
     */
    static async rotateLink(oldLinkId: string, userId: string): Promise<string> {
        const oldLink = await prisma.shareLink.findUnique({ where: { id: oldLinkId } });
        if (!oldLink) throw new Error("Link not found");

        await this.revokeLink(oldLinkId);

        return this.createLink(
            oldLink.organizationId,
            oldLink.entityType,
            oldLink.entityId,
            userId
        );
    }

    /**
     * Helper: SHA-256 Hash
     */
    private static hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }
}
