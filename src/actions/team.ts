"use server";

import prisma from "@/lib/prisma";
import { generateInviteToken, hashToken, validateInvitation } from "@/services/invite-service";
import { createAuditLog } from "@/services/audit-service";
import { isAdmin, isOwner } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureNotPaused } from "@/lib/guards/subscription-guard";

import { sendTeamInvitationEmail } from "@/lib/email";
import { ActivationService } from "@/services/activation-service";

/**
 * Invites a new member to an organization.
 */
export async function inviteMemberAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const orgId = formData.get("organizationId") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as any; // MembershipRole

    // 0. Rate Limiting (Anti-Abuse)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const invitesToday = await prisma.auditLog.count({
        where: {
            organizationId: orgId,
            action: 'INVITE_SENT',
            createdAt: { gte: oneDayAgo }
        }
    });

    const invitesHour = await prisma.auditLog.count({
        where: {
            organizationId: orgId,
            action: 'INVITE_SENT',
            createdAt: { gte: oneHourAgo }
        }
    });

    if (invitesToday >= 20 || invitesHour >= 5) {
        await createAuditLog({
            organizationId: orgId,
            userId: user.id,
            action: 'INVITE_RATE_LIMIT_HIT' as any,
            details: `Limit hit: ${invitesToday}/day, ${invitesHour}/hour`
        });
        throw new Error("Has alcanzado el límite de invitaciones. Por seguridad, espera un momento antes de enviar más.");
    }

    // 1. Validate inviter permissions
    const member = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId: user.id } }
    });

    if (!member || !isAdmin(member.role)) {
        throw new Error("Only admins can invite members");
    }

    // 2. Validate Org Mode (MVP: Only TEAM mode allowed for invites)
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org || org.mode !== 'TEAM') {
        throw new Error("Please upgrade to TEAM mode to invite members");
    }

    // 3. Idempotency Check: Look for existing PENDING invitation
    const existingInvite = await prisma.userInvitation.findFirst({
        where: {
            organizationId: orgId,
            email,
            status: 'PENDING',
            expiresAt: { gt: new Date() }
        }
    });

    let invite;
    let plainToken;

    if (existingInvite) {
        // Reuse existing invite but update send stats
        invite = await prisma.userInvitation.update({
            where: { id: existingInvite.id },
            data: {
                sentAt: new Date(),
                sentCount: { increment: 1 }
            }
        });
        // Note: For security, we don't have the plain token anymore unless we use a fixed one (not recommended)
        // or we generate a NEW one if we want "Resend" to be truly a fresh start.
        // For Wave 4.2 simplification, we will generate a fresh token on Resend/Idempotent reuse 
        // to ensure the user gets a working link without complex token retrieval.
        plainToken = generateInviteToken();
        const tokenHash = hashToken(plainToken);
        invite = await prisma.userInvitation.update({
            where: { id: existingInvite.id },
            data: {
                tokenHash,
                sentAt: new Date(),
                sentCount: { increment: 1 },
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Reset expiration
            }
        });
    } else {
        // 4. Generate token and secure hash
        plainToken = generateInviteToken();
        const tokenHash = hashToken(plainToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // 5. Create invitation
        invite = await prisma.userInvitation.create({
            data: {
                organizationId: orgId,
                email,
                role,
                tokenHash,
                expiresAt,
                invitedByUserId: user.id,
                status: 'PENDING',
                sentAt: new Date(),
                sentCount: 1
            }
        });
    }

    const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/join?token=${plainToken}`;

    // 6. Send Email
    await sendTeamInvitationEmail({
        to: email,
        orgName: org.name,
        invitedBy: user.email || 'Un administrador',
        joinUrl,
        expiresAt: invite.expiresAt
    });

    // 7. Audit & Milestone
    await createAuditLog({
        organizationId: orgId,
        userId: user.id,
        action: 'INVITE_SENT',
        details: `Invited ${email} with role ${role} (SentCount: ${invite.sentCount})`
    });

    await ActivationService.trackMilestone(orgId, 'FIRST_INVITE_SENT', user.id);

    revalidatePath("/settings/team");

    return {
        success: true,
        inviteLink: joinUrl
    };
}

/**
 * Resends a pending invitation.
 */
export async function resendInvitationAction(invitationId: string, orgId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Rate Limit for Resends
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const resendsHour = await prisma.auditLog.count({
        where: {
            organizationId: orgId,
            userId: user.id,
            action: 'INVITE_SENT',
            createdAt: { gte: oneHourAgo }
        }
    });

    if (resendsHour >= 5) {
        throw new Error("Límite de reenvíos alcanzado. Espera un momento.");
    }

    const invitation = await prisma.userInvitation.findUnique({
        where: { id: invitationId }
    });

    if (!invitation || invitation.status !== 'PENDING') {
        throw new Error("Invitation not found or not in pending state");
    }

    const plainToken = generateInviteToken();
    const tokenHash = hashToken(plainToken);

    await prisma.userInvitation.update({
        where: { id: invitationId },
        data: {
            tokenHash,
            sentAt: new Date(),
            sentCount: { increment: 1 },
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
    });

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/join?token=${plainToken}`;

    await sendTeamInvitationEmail({
        to: invitation.email,
        orgName: org?.name || 'TechWise',
        invitedBy: user.email || 'Un administrador',
        joinUrl,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        type: 'RESEND'
    });

    await createAuditLog({
        organizationId: orgId,
        userId: user.id,
        action: 'INVITE_SENT',
        details: `Resent invitation for ${invitation.email}`
    });

    revalidatePath("/settings/team");
    return { success: true, inviteLink: joinUrl };
}

/**
 * Accepts an invitation and joins the organization.
 */
export async function acceptInvitationAction(token: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Please log in to accept the invitation");

    // 1. Validate invitation
    const invitation = await validateInvitation(token);
    if (!invitation) throw new Error("Invalid or expired invitation");

    // 2. Seat Limit Check
    const currentMembers = await prisma.organizationMember.count({
        where: { organizationId: invitation.organizationId, status: 'ACTIVE' }
    });

    // Determine max seats
    let maxSeats = 1; // Default for SOLO or FREE
    const subscription = invitation.organization.subscription;

    if (invitation.organization.mode === 'SOLO') {
        maxSeats = 1;
    } else if (subscription) {
        maxSeats = subscription.seatLimit || 1;
    } else {
        // Fallback for trial or internal plan logic
        maxSeats = (invitation.organization.plan as any) === 'PRO' ? 10 : 1;
    }

    if (currentMembers >= maxSeats) {
        await createAuditLog({
            organizationId: invitation.organizationId,
            userId: user.id,
            action: 'SEAT_LIMIT_BLOCK' as any,
            details: `Failed to join org ${invitation.organizationId} due to seat limit (${currentMembers}/${maxSeats})`
        });
        throw new Error("La organización alcanzó su límite de asientos. Pide al Owner que amplíe el plan.");
    }

    // 3. Create or Update Membership
    await prisma.organizationMember.upsert({
        where: {
            organizationId_userId: {
                organizationId: invitation.organizationId,
                userId: user.id
            }
        },
        update: {
            role: invitation.role,
            status: 'ACTIVE'
        },
        create: {
            organizationId: invitation.organizationId,
            userId: user.id,
            role: invitation.role,
            status: 'ACTIVE'
        }
    });

    // 4. Mark invitation as accepted
    await prisma.userInvitation.update({
        where: { id: invitation.id },
        data: {
            status: 'ACCEPTED',
            acceptedAt: new Date()
        }
    });

    // 5. Audit & Milestone
    await createAuditLog({
        organizationId: invitation.organizationId,
        userId: user.id,
        action: 'INVITE_ACCEPTED',
        details: `Joined organization via invitation (Seat ${currentMembers + 1}/${maxSeats})`
    });

    await ActivationService.trackMilestone(invitation.organizationId, 'FIRST_INVITE_ACCEPTED', user.id);

    revalidatePath("/dashboard");

    return { success: true, organizationId: invitation.organizationId };
}

/**
 * Revokes a pending invitation.
 */
export async function revokeInvitationAction(invitationId: string, orgId: string) {
    await ensureNotPaused(orgId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Validate permissions
    const member = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId: user.id } }
    });

    if (!member || !isAdmin(member.role)) {
        throw new Error("Only admins can revoke invitations");
    }

    // 2. Revoke
    const invitation = await prisma.userInvitation.update({
        where: { id: invitationId },
        data: {
            status: 'REVOKED',
            revokedAt: new Date()
        }
    });

    // 3. Audit
    await createAuditLog({
        organizationId: orgId,
        userId: user.id,
        action: 'INVITE_REVOKED',
        details: `Revoked invitation for ${invitation.email}`
    });

    revalidatePath("/settings/team");
    return { success: true };
}

/**
 * Updates a member's role.
 */
export async function updateMemberRoleAction(memberId: string, orgId: string, newRole: any) {
    await ensureNotPaused(orgId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Validate permissions (Only OWNER can change roles in v1)
    const executor = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId: user.id } }
    });

    if (!executor || !isOwner(executor.role)) {
        throw new Error("Only the owner can manage member roles");
    }

    // 2. Safety check: Don't allow changing the last owner
    const targetMember = await prisma.organizationMember.findUnique({ where: { id: memberId } });
    if (targetMember?.role === 'OWNER' && newRole !== 'OWNER') {
        const ownersCount = await prisma.organizationMember.count({
            where: { organizationId: orgId, role: 'OWNER' }
        });
        if (ownersCount <= 1) {
            throw new Error("Cannot change role of the last owner. Promote another member to owner first.");
        }
    }

    // 3. Update
    const updatedMember = await prisma.organizationMember.update({
        where: { id: memberId },
        data: { role: newRole }
    });

    // 4. Audit
    await createAuditLog({
        organizationId: orgId,
        userId: user.id,
        action: 'MEMBER_ROLE_CHANGED',
        details: `Changed role of member ${memberId} to ${newRole}`
    });

    revalidatePath("/settings/team");
    return { success: true };
}

/**
 * Removes a member from the organization.
 */
export async function removeMemberAction(memberId: string, orgId: string) {
    await ensureNotPaused(orgId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Validate permissions
    const executor = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId: user.id } }
    });

    if (!executor || !isAdmin(executor.role)) {
        throw new Error("Insufficient permissions to remove members");
    }

    // 2. Safety checks
    const targetMember = await prisma.organizationMember.findUnique({ where: { id: memberId } });
    if (!targetMember) throw new Error("Member not found");

    if (targetMember.role === 'OWNER') {
        if (!isOwner(executor.role)) throw new Error("Only owners can remove other owners");
        const ownersCount = await prisma.organizationMember.count({
            where: { organizationId: orgId, role: 'OWNER' }
        });
        if (ownersCount <= 1) throw new Error("Cannot remove the last owner");
    }

    // 3. Delete
    await prisma.organizationMember.delete({ where: { id: memberId } });

    // 4. Audit
    await createAuditLog({
        organizationId: orgId,
        userId: user.id,
        action: 'MEMBER_REMOVED',
        details: `Removed member ${memberId}`
    });

    revalidatePath("/settings/team");
    return { success: true };
}
