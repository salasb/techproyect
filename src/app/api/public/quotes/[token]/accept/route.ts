import { NextRequest, NextResponse } from "next/server";
import { ShareLinkService } from "@/services/share-link-service";
import prisma from "@/lib/prisma";
import { AuditService } from "@/services/auditService";

export const dynamic = 'force-dynamic';

export async function POST(
    req: NextRequest,
    { params }: { params: { token: string } }
) {
    const { token } = params;

    // 1. Verify Token
    const auth = await ShareLinkService.verifyLink(token);

    if (!auth.isValid || !auth.link || auth.link.entityType !== 'QUOTE') {
        return NextResponse.json({ error: auth.error || 'Invalid Link' }, { status: 400 });
    }

    const quoteId = auth.link.entityId;

    try {
        // 2. Get Quote to check status
        const quote = await prisma.quote.findUnique({
            where: { id: quoteId },
            include: { project: true }
        });

        if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

        if (quote.status !== 'SENT' && quote.status !== 'DRAFT') {
            return NextResponse.json({ error: 'Quote cannot be accepted in current status' }, { status: 400 });
        }

        // 3. Update Status
        await prisma.quote.update({
            where: { id: quoteId },
            data: {
                status: 'ACCEPTED',
                updatedAt: new Date()
            }
        });

        // 4. Update Project Status if needed (e.g. to 'ACEPTADO' or start stage)
        // For now, just log.
        await AuditService.logAction(quote.projectId, 'QUOTE_ACCEPT', `Cotización #${quote.version} aceptada públicamente.`);

        // 5. Redirect back to page with success
        // Use 303 See Other for POST-redirect-GET pattern
        const url = new URL(`/p/q/${token}`, req.url);
        url.searchParams.set('accepted', 'true');

        return NextResponse.redirect(url, 303);

    } catch (error) {
        console.error("Error accepting quote:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
