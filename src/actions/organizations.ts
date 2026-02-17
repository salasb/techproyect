'use server';

import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OrganizationMode, SubscriptionStatus, Prisma } from "@prisma/client";

/**
 * Creates a new organization with initial subscription and owner membership.
 */
export async function createOrganizationAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const name = formData.get('name') as string;
    const mode = formData.get('mode') as OrganizationMode || 'SOLO';
    const country = formData.get('country') as string || 'CL';
    const vatRate = country === 'CL' ? 0.19 : 0;

    // Use Prisma for transaction to ensure atomicity
    const org = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Create Organization
        const newOrg = await tx.organization.create({
            data: {
                name,
                mode,
                settings: {
                    country,
                    vatRate,
                    isSoloMode: mode === 'SOLO'
                }
            }
        });

        // 2. Create Membership (Owner)
        await tx.organizationMember.create({
            data: {
                organizationId: newOrg.id,
                userId: user.id,
                role: 'owner',
                status: 'ACTIVE'
            }
        });

        // 3. Create Subscription (Trial 14 days)
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);

        await tx.subscription.create({
            data: {
                organizationId: newOrg.id,
                status: 'TRIALING',
                planCode: 'PRO_TRIAL',
                trialEndsAt,
                seatLimit: mode === 'SOLO' ? 1 : 5
            }
        });

        // 4. Initialize Stats
        await tx.organizationStats.create({
            data: {
                organizationId: newOrg.id,
                healthScore: 100
            }
        });

        return newOrg;
    });

    // Set as current organization
    const cookieStore = await cookies();
    cookieStore.set('app-org-id', org.id);

    redirect('/dashboard');
}

/**
 * Switches current organization context
 */
export async function switchOrganizationAction(organizationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Verify membership
    const membership = await prisma.organizationMember.findFirst({
        where: {
            organizationId,
            userId: user.id,
            status: 'ACTIVE'
        }
    });

    if (!membership) throw new Error("No access to this organization");

    const cookieStore = await cookies();
    cookieStore.set('app-org-id', organizationId);

    redirect('/dashboard');
}

/**
 * Gets organizations for the current user
 */
export async function getUserOrganizations() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    return prisma.organization.findMany({
        where: {
            organizationMember: {
                some: {
                    userId: user.id,
                    status: 'ACTIVE'
                }
            }
        },
        include: {
            subscription: true
        }
    });
}
