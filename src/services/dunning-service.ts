import prisma from "@/lib/prisma";
import { PaymentIssueStatus, SubscriptionStatus } from "@prisma/client";
import { ActivationService } from "./activation-service";

export class DunningService {
    /**
     * Records a payment failure and updates the organization state.
     */
    static async handlePaymentFailure(organizationId: string, invoiceId?: string) {
        // 1. Log the failure in PaymentIssue
        const issue = await prisma.paymentIssue.upsert({
            where: { id: `payment_${organizationId}_${invoiceId || 'latest'}` }, // Simplified ID for this implementation
            update: {
                attemptCount: { increment: 1 },
                lastAttemptAt: new Date(),
                status: PaymentIssueStatus.OPEN
            },
            create: {
                id: `payment_${organizationId}_${invoiceId || 'latest'}`,
                organizationId,
                invoiceId,
                status: PaymentIssueStatus.OPEN,
                attemptCount: 1
            }
        });

        // 2. Update Subscription status to PAST_DUE if it's currently ACTIVE
        await prisma.subscription.updateMany({
            where: {
                organizationId,
                status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] }
            },
            data: { status: SubscriptionStatus.PAST_DUE }
        });

        // 3. Track in Funnel
        await ActivationService.trackFunnelEvent('PAYMENT_FAILED', organizationId, `dunning_fail_${issue.id}_${issue.attemptCount}`, undefined, {
            attempt: issue.attemptCount,
            invoiceId
        });

        // 4. Send Email Alert (Optional: fetching admin users)
        const { LifecycleEmailService } = await import("./lifecycle-email");
        const admins = await prisma.organizationMember.findMany({
            where: { organizationId, role: 'ADMIN' },
            include: { profile: true }
        });

        for (const admin of admins) {
            await LifecycleEmailService.sendLifecycleEmail({
                organizationId,
                userId: admin.userId,
                templateKey: 'DUNNING_FAIL',
                dedupeKey: `dunning_fail_email_${issue.id}_${issue.attemptCount}_${admin.userId}`,
                isBilling: true
            });
        }

        return issue;
    }

    /**
     * Resolves a payment issue when a payment succeeds.
     */
    static async handlePaymentSuccess(organizationId: string) {
        // 1. Resolve all open issues
        await prisma.paymentIssue.updateMany({
            where: { organizationId, status: PaymentIssueStatus.OPEN },
            data: { status: PaymentIssueStatus.RESOLVED }
        });

        // 2. Update Subscription status back to ACTIVE
        await prisma.subscription.updateMany({
            where: { organizationId, status: SubscriptionStatus.PAST_DUE },
            data: { status: SubscriptionStatus.ACTIVE }
        });

        // 3. Track recovery
        await ActivationService.trackFunnelEvent('PAYMENT_RECOVERED', organizationId, `dunning_success_${Date.now()}`);

        // 4. Send Success Email
        const { LifecycleEmailService } = await import("./lifecycle-email");
        const admins = await prisma.organizationMember.findMany({
            where: { organizationId, role: 'ADMIN' },
            include: { profile: true }
        });

        for (const admin of admins) {
            await LifecycleEmailService.sendLifecycleEmail({
                organizationId,
                userId: admin.userId,
                templateKey: 'DUNNING_RECOVERED',
                dedupeKey: `dunning_success_email_${Date.now()}_${admin.userId}`,
                isBilling: true
            });
        }
    }

    /**
     * Gets the current open payment issue for an organization.
     */
    static async getOpenIssue(organizationId: string) {
        return prisma.paymentIssue.findFirst({
            where: { organizationId, status: PaymentIssueStatus.OPEN },
            orderBy: { lastAttemptAt: 'desc' }
        });
    }
}
