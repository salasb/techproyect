import { generateId } from "@/lib/id";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export type OutboundEvent = 
    | 'quote.accepted' 
    | 'invoice.created' 
    | 'invoice.paid' 
    | 'payment.failed' 
    | 'ticket.created';

export class OutboundWebhookService {
    /**
     * Dispatches an event to all registered endpoints for an organization.
     */
    static async dispatch(organizationId: string, eventName: OutboundEvent, payload: any) {
        const endpoints = await prisma.webhookEndpoint.findMany({
            where: { organizationId, isActive: true }
        });

        const activeEndpoints = endpoints.filter(ep => ep.events.includes(eventName) || ep.events.includes('*'));

        for (const endpoint of activeEndpoints) {
            // Process in background (don't await for the HTTP call here to avoid blocking main thread)
            this.sendToEndpoint(endpoint.id, eventName, payload).catch(err => {
                console.error(`[WebhookDispatch] Fatal error sending to ${endpoint.url}:`, err);
            });
        }
    }

    private static async sendToEndpoint(endpointId: string, eventName: string, payload: any, attempt = 1) {
        const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
        if (!endpoint || !endpoint.isActive) return;

        const startTime = Date.now();
        const body = JSON.stringify({
            id: generateId(),
            event: eventName,
            createdAt: new Date().toISOString(),
            data: payload
        });

        // 1. Sign Payload (HMAC-SHA256)
        const signature = crypto
            .createHmac('sha256', endpoint.secret)
            .update(body)
            .digest('hex');

        try {
            const response = await fetch(endpoint.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-TechWise-Signature': signature,
                    'X-TechWise-Event': eventName,
                    'User-Agent': 'TechWise-Webhooks/1.0'
                },
                body,
                // Short timeout for webhooks
                signal: AbortSignal.timeout(5000) 
            });

            const durationMs = Date.now() - startTime;
            const responseText = await response.text();

            // Log entry
            await prisma.webhookLog.create({
                data: {
                    webhookEndpointId: endpointId,
                    eventName,
                    payload: payload as any,
                    statusCode: response.status,
                    responseBody: responseText.substring(0, 1000), // Limit size
                    durationMs,
                    attemptCount: attempt
                }
            });

            // Retry logic for 5xx errors (up to 3 attempts)
            if (response.status >= 500 && attempt < 3) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                setTimeout(() => this.sendToEndpoint(endpointId, eventName, payload, attempt + 1), delay);
            }

        } catch (error: any) {
            const durationMs = Date.now() - startTime;
            
            await prisma.webhookLog.create({
                data: {
                    webhookEndpointId: endpointId,
                    eventName,
                    payload: payload as any,
                    statusCode: null,
                    error: error.message,
                    durationMs,
                    attemptCount: attempt
                }
            });

            // Retry on network errors
            if (attempt < 3) {
                const delay = Math.pow(2, attempt) * 1000;
                setTimeout(() => this.sendToEndpoint(endpointId, eventName, payload, attempt + 1), delay);
            }
        }
    }
}
