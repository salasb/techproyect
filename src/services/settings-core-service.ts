import prisma from "@/lib/prisma";
import { AccessContext } from "@/lib/auth/access-resolver";
import { isAdmin } from "@/lib/permissions";

export interface SettingsTeamData {
    members: any[];
    invitations: any[];
    customRoles: any[];
    org: any;
    currentMember: any;
}

export const SettingsCoreService = {
    /**
     * Fetches all data required for the Team Settings page.
     */
    async getTeamData(context: AccessContext): Promise<SettingsTeamData> {
        const { activeOrgId, userId } = context;
        if (!activeOrgId) throw new Error("MISSING_CONTEXT");

        const [currentMember, members, invitations, customRoles, org] = await Promise.all([
            prisma.organizationMember.findUnique({
                where: { organizationId_userId: { organizationId: activeOrgId, userId } },
                include: { organization: true }
            }),
            prisma.organizationMember.findMany({
                where: { organizationId: activeOrgId },
                include: { profile: true, customRole: true },
                orderBy: { createdAt: 'asc' }
            }),
            prisma.userInvitation.findMany({
                where: {
                    organizationId: activeOrgId,
                    status: 'PENDING',
                    expiresAt: { gt: new Date() }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.customRole.findMany({
                where: { organizationId: activeOrgId }
            }),
            prisma.organization.findUnique({
                where: { id: activeOrgId },
                include: { subscription: true }
            })
        ]);

        if (!currentMember || (!isAdmin(currentMember.role) && !context.isGlobalOperator)) {
            throw new Error("FORBIDDEN");
        }

        return {
            currentMember,
            members,
            invitations,
            customRoles,
            org
        };
    },

    /**
     * Fetches all data required for the Organization Hub page.
     */
    async getOrganizationData(context: AccessContext) {
        const { activeOrgId } = context;
        if (!activeOrgId) throw new Error("MISSING_CONTEXT");

        const org = await prisma.organization.findUnique({
            where: { id: activeOrgId },
            include: { 
                subscription: true,
                stats: true,
                OrganizationMember: {
                    include: { profile: true }
                },
                _count: {
                    select: { projects: true }
                }
            }
        });

        if (!org) throw new Error("NOT_FOUND");

        // Fetch Commercial Data in Parallel
        const [quotes, invoices] = await Promise.all([
            prisma.quote.findMany({
                where: { project: { organizationId: activeOrgId } },
                include: { project: true },
                orderBy: { createdAt: 'desc' },
                take: 10
            }),
            prisma.invoice.findMany({
                where: { organizationId: activeOrgId },
                include: { project: true },
                orderBy: { updatedAt: 'desc' },
                take: 10
            })
        ]);

        return {
            org,
            quotes,
            invoices
        };
    }
};
