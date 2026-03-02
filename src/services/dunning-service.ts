import prisma from "@/lib/prisma";
import { PaymentIssueStatus, SubscriptionStatus } from "@prisma/client";
import { ActivationService } from "./activation-service";
import { OutboundWebhookService } from "./outbound-webhook-service";

export class DunningService {
    /**
     * Records a payment failure and updates the organization state.
     */
    static async handlePaymentFailure(organizationId: string, invoiceId?: string) {
        const MAX_ATTEMPTS_BEFORE_PAUSE = 3;

        // 1. Log the failure in PaymentIssue
        const issue = await prisma.paymentIssue.upsert({
            where: { id: `payment_${organizationId}_${invoiceId || 'latest'}` },
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

        // 2. Decide new status
        // If it's the 3rd attempt or more, OR it's been more than 14 days, we pause the service.
        const daysSinceStart = Math.floor((Date.now() - issue.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const shouldPause = issue.attemptCount >= MAX_ATTEMPTS_BEFORE_PAUSE || daysSinceStart >= 14;
        const newStatus = shouldPause ? SubscriptionStatus.PAUSED : SubscriptionStatus.PAST_DUE;

        // 3. Update Subscription status
        await prisma.subscription.updateMany({
            where: {
                organizationId,
                status: { not: SubscriptionStatus.CANCELED }
            },
            data: { status: newStatus }
        });

        // 4. Track in Funnel
        await ActivationService.trackFunnelEvent(
            shouldPause ? 'SUBSCRIPTION_PAUSED' : 'PAYMENT_FAILED', 
            organizationId, 
            `dunning_fail_${issue.id}_${issue.attemptCount}`, 
            undefined, 
            {
                attempt: issue.attemptCount,
                invoiceId,
                newStatus
            }
        );

        // Outbound Webhook
        await OutboundWebhookService.dispatch(organizationId, 'payment.failed', {
            organizationId,
            invoiceId,
            attemptCount: issue.attemptCount,
            newStatus
        });

        // 5. Send Email Alert
        const { LifecycleEmailService } = await import("./lifecycle-email");
        const admins = await prisma.organizationMember.findMany({
            where: { organizationId, role: 'ADMIN' },
            include: { profile: true }
        });

        const templateKey = shouldPause ? 'DUNNING_FINAL' : 'DUNNING_FAIL';
        const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://techwise.pro';
        const recoveryUrl = `${APP_URL}/settings/billing?recovery=1&issueId=${issue.id}`;

        for (const admin of admins) {
            await LifecycleEmailService.sendLifecycleEmail({
                organizationId,
                userId: admin.userId,
                templateKey: templateKey as any,
                dedupeKey: `dunning_email_${templateKey}_${issue.id}_${issue.attemptCount}_${admin.userId}`,
                isBilling: true,
                ctaUrl: recoveryUrl
            });
        }

        return { issue, newStatus };
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
