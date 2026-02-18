import prisma from "@/lib/prisma";
import crypto from "node:crypto";

/**
 * Generates a secure random token in plain text.
 */
export function generateInviteToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Creates a SHA-256 hash of the plain text token for secure storage.
 */
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Validates a token by comparing its hash with the stored hash.
s */
export async function validateInvitation(token: string) {
    const tokenHash = hashToken(token);

    const invitation = await prisma.userInvitation.findFirst({
        where: {
            tokenHash,
            status: 'PENDING',
            expiresAt: {
                gt: new Date(),
            }
        },
        include: {
            organization: {
                include: {
                    subscription: true
                }
            }
        }
    });

    return invitation;
}
