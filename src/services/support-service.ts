import prisma from "@/lib/prisma";
import { TicketStatus, TicketPriority } from "@prisma/client";
import { AuditService } from "@/services/auditService";
import { OutboundWebhookService } from "./outbound-webhook-service";

export class SupportService {
    /**
     * Creates a new support ticket.
     */
    static async createTicket(args: {
        organizationId: string;
        userId: string;
        title: string;
        description: string;
        priority?: TicketPriority;
    }) {
        const { organizationId, userId, title, description, priority = TicketPriority.P2 } = args;

        const ticket = await prisma.supportTicket.create({
            data: {
                organizationId,
                userId,
                title,
                description,
                priority,
                status: TicketStatus.OPEN
            }
        });

        // Outbound Webhook
        await OutboundWebhookService.dispatch(organizationId, 'ticket.created', {
            ticketId: ticket.id,
            title: ticket.title,
            priority: ticket.priority,
            userId
        });

        await AuditService.logAction(
            null,
            'TICKET_CREATED',
            `Ticket #${ticket.id} creado: ${title}`,
            { id: userId },
            organizationId
        );

        return ticket;
    }

    /**
     * Adds a message to a ticket thread.
     */
    static async addMessage(args: {
        ticketId: string;
        userId: string;
        content: string;
        isAdminReply?: boolean;
    }) {
        const { ticketId, userId, content, isAdminReply = false } = args;

        const ticket = await prisma.supportTicket.findUnique({
            where: { id: ticketId },
            select: { organizationId: true, status: true }
        });

        if (!ticket) throw new Error("Ticket not found");

        const message = await prisma.supportMessage.create({
            data: {
                ticketId,
                userId,
                content,
                isAdminReply
            }
        });

        // Update ticket timestamp and status if it was RESOLVED but customer replied
        const newStatus = (!isAdminReply && ticket.status === TicketStatus.RESOLVED) 
            ? TicketStatus.IN_PROGRESS 
            : (isAdminReply && ticket.status === TicketStatus.OPEN)
                ? TicketStatus.IN_PROGRESS
                : ticket.status;

        await prisma.supportTicket.update({
            where: { id: ticketId },
            data: { 
                updatedAt: new Date(),
                status: newStatus
            }
        });

        return message;
    }

    /**
     * Updates ticket status.
     */
    static async updateStatus(ticketId: string, status: TicketStatus, userId: string) {
        const ticket = await prisma.supportTicket.findUnique({
            where: { id: ticketId },
            select: { organizationId: true, title: true }
        });

        if (!ticket) throw new Error("Ticket not found");

        const updatedTicket = await prisma.supportTicket.update({
            where: { id: ticketId },
            data: { 
                status,
                resolvedAt: status === TicketStatus.RESOLVED ? new Date() : null,
                updatedAt: new Date()
            }
        });

        await AuditService.logAction(
            null,
            'TICKET_STATUS_CHANGED',
            `Ticket #${ticketId} status cambiado a ${status}`,
            { id: userId },
            ticket.organizationId
        );

        return updatedTicket;
    }

    /**
     * Gets tickets for an organization.
     */
    static async getOrganizationTickets(organizationId: string) {
        return prisma.supportTicket.findMany({
            where: { organizationId },
            include: {
                profile: { select: { name: true, email: true } },
                _count: { select: { messages: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Gets ticket details with message thread.
     */
    static async getTicketDetails(ticketId: string, organizationId?: string) {
        const where: any = { id: ticketId };
        if (organizationId) where.organizationId = organizationId;

        return prisma.supportTicket.findUnique({
            where,
            include: {
                profile: { select: { name: true, email: true } },
                messages: {
                    include: {
                        profile: { select: { name: true, email: true, avatarUrl: true } }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                organization: { select: { name: true } }
            }
        });
    }

    /**
     * Gets all tickets (Superadmin view).
     */
    static async getAllTickets() {
        return prisma.supportTicket.findMany({
            include: {
                profile: { select: { name: true, email: true } },
                organization: { select: { name: true } },
                _count: { select: { messages: true } }
            },
            orderBy: [
                { status: 'asc' }, // OPEN first
                { priority: 'asc' }, // P0 first (assuming P0 is 'asc' lower value or we handle it)
                { createdAt: 'desc' }
            ]
        });
    }
}
