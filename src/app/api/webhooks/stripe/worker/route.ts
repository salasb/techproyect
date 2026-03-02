import { WebhookWorkerService } from "@/services/webhook-worker-service";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * Internal Worker Route (v1.0)
 * Triggered by the main webhook receiver.
 * Security: Requires a secret token to prevent external triggers.
 */
export async function POST(req: Request) {
    const authHeader = req.headers.get('Authorization');
    const expectedToken = process.env.INTERNAL_WORKER_SECRET || 'LOCAL_WORKER_SECRET';

    if (authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, traceId } = await req.json();

    if (!eventId) {
        return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
    }

    // Process asynchronously (non-blocking)
    // Note: In Next.js App Router, the process may end if we don't await.
    // However, for this implementation, we will await but send ACK fast in the caller.
    await WebhookWorkerService.processEvent(eventId, traceId);

    return NextResponse.json({ success: true });
}
