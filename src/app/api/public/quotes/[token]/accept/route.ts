import { NextRequest, NextResponse } from "next/server";
import { ShareLinkService } from "@/services/share-link-service";
import prisma from "@/lib/prisma";
import { AuditService } from "@/services/auditService";

export const dynamic = 'force-dynamic';

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ token: string }> }
) {
    const { token } = await context.params;

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

        // Idempotency: If already accepted, treat as success
        if (quote.status === 'ACCEPTED') {
            const url = new URL(`/p/q/${token}?accepted=true`, req.url);
            return NextResponse.redirect(url, 303);
        }

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

        // 4. Update Project Log & Audit
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const userAgent = req.headers.get('user-agent') || 'unknown';

        await AuditService.logAction(
            quote.projectId,
            'QUOTE_ACCEPT_PUBLIC',
            `Cotización #${quote.version} aceptada vía enlace público.`,
            {
                name: 'Cliente (Público)',
                ip,
                userAgent
            }
        );

        // 5. Redirect back to page with success
        const url = new URL(`/p/q/${token}`, req.url);
        url.searchParams.set('accepted', 'true');

        return NextResponse.redirect(url, 303);

    } catch (error) {
        console.error("Error accepting quote:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
