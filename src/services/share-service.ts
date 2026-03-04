import { crypto } from "next/dist/compiled/@edge-runtime/primitives";
import prisma from "@/lib/prisma";
import { QuoteShareLink } from "@prisma/client";

/**
 * ShareService (v1.0)
 * Handles secure public links for Quotes using SHA-256 hashing.
 */
export class ShareService {
    
    /**
     * Generates a secure random token and its hash.
     */
    static generateToken() {
        const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        const encoder = new TextEncoder();
        const data = encoder.encode(token);
        // Using Node's crypto since it's cleaner for server-side
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(token).digest('hex');
        
        return { token, hash };
    }

    /**
     * Resolves a public token to its QuoteShareLink record.
     */
    static async resolveToken(token: string): Promise<(QuoteShareLink & { quote: any }) | null> {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(token).digest('hex');

        const shareLink = await prisma.quoteShareLink.findFirst({
            where: { 
                tokenHash: hash,
                status: 'ACTIVE',
                expiresAt: { gt: new Date() }
            },
            include: {
                quote: {
                    include: {
                        project: {
                            include: { client: true }
                        },
                        items: {
                            where: { isSelected: true }
                        },
                        invoices: {
                            orderBy: { createdAt: 'desc' },
                            take: 1
                        }
                    }
                },
                organization: {
                    include: { settings: true }
                }
            }
        });

        return shareLink as any;
    }

    /**
     * Creates or updates a share link for a quote.
     */
    static async createShareLink(quoteId: string, orgId: string) {
        const { token, hash } = this.generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days default

        await prisma.quoteShareLink.upsert({
            where: { tokenHash: hash },
            update: {
                status: 'ACTIVE',
                expiresAt,
            },
            create: {
                quoteId,
                organizationId: orgId,
                tokenHash: hash,
                expiresAt,
                status: 'ACTIVE'
            }
        });

        return { token };
    }
}
