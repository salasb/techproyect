import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { getWorkspaceState, WorkspaceState } from './workspace-resolver';
import { SubscriptionStatus } from '@prisma/client';

export type GlobalRole = 'SUPERADMIN' | 'STAFF' | 'USER';

export interface AccessContext {
    userId: string;
    email: string;
    globalRole: GlobalRole | null;
    isCreator: boolean;
    isGlobalOperator: boolean;
    activeOrgId: string | null;
    localMembershipRole: string | null;
    subscriptionStatus: string | null;
    trialEndsAt: string | null;
    billingGateApplies: boolean;
    readOnlyReason: 'NONE' | 'TRIAL_EXPIRED' | 'SUBSCRIPTION_PAUSED' | 'SUBSCRIPTION_CANCELED' | 'SUBSCRIPTION_PAST_DUE' | 'NO_ACTIVE_ORG' | 'NO_MEMBERSHIP' | 'TENANT_LOCKED';
    effectiveMode: 'GLOBAL' | 'TENANT_RW' | 'TENANT_RO' | 'NO_CONTEXT';
    traceId: string;
}

/**
 * RESOLVE ACCESS CONTEXT (v3.0)
 * The Definitive Source of Truth for Identity and Precedence.
 * Implements: GLOBAL IDENTITY FIRST.
 */
export async function resolveAccessContext(): Promise<AccessContext> {
    const traceId = `ACC-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const supabase = await createClient();
    
    // 1. Resolve Auth User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
        throw new Error("UNAUTHORIZED");
    }

    const email = user.email ? user.email.toLowerCase() : '';

    // 2. Resolve Global Profile (Strictly from DB)
    const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { email: true, role: true }
    });

    const allowlist = process.env.SUPERADMIN_ALLOWLIST?.split(/[,\n;]/).map(e => e.trim().toLowerCase()).filter(Boolean) || [];
    const isCreator = allowlist.includes(email);

    let globalRole: GlobalRole = (profile?.role as GlobalRole) || 'USER';
    if (isCreator && globalRole !== 'SUPERADMIN') {
        globalRole = 'SUPERADMIN'; // Bootstrap dynamically if needed for the current context
    }

    const isGlobalOperator = isCreator || globalRole === 'SUPERADMIN' || globalRole === 'STAFF';

    // 3. Resolve Workspace State (Tenant Context)
    // We catch errors to prevent global operators from being blocked by tenant-level issues
    let workspace: WorkspaceState | null = null;
    try {
        workspace = await getWorkspaceState();
    } catch (e) {
        console.warn(`[AccessResolver][${traceId}] Workspace resolution failed, but continuing for global check.`);
    }

    const activeOrgId = workspace?.activeOrgId || null;
    const localRole = workspace?.userRole || null;

    // 4. Resolve Subscription / Billing for the active org
    let subStatus: string | null = null;
    let trialEnd: Date | null = null;

    if (activeOrgId) {
        const sub = await prisma.subscription.findUnique({
            where: { organizationId: activeOrgId },
            select: { status: true, trialEndsAt: true }
        });
        subStatus = sub?.status || null;
        trialEnd = sub?.trialEndsAt || null;
    }

    const trialEndsAtStr = trialEnd ? trialEnd.toISOString() : null;

    // 5. Evaluate Context Reason
    let readOnlyReason: AccessContext['readOnlyReason'] = 'NONE';
    if (!activeOrgId) readOnlyReason = 'NO_ACTIVE_ORG';
    else if (!localRole && !isGlobalOperator) readOnlyReason = 'NO_MEMBERSHIP';
    else if (subStatus === SubscriptionStatus.PAUSED) readOnlyReason = 'SUBSCRIPTION_PAUSED';
    else if (subStatus === SubscriptionStatus.CANCELED) readOnlyReason = 'SUBSCRIPTION_CANCELED';
    else if (subStatus === SubscriptionStatus.PAST_DUE) readOnlyReason = 'SUBSCRIPTION_PAST_DUE';
    else if (subStatus === SubscriptionStatus.TRIALING && trialEnd && new Date() > trialEnd) readOnlyReason = 'TRIAL_EXPIRED';

    // 6. Determine Precedence and Effective Mode
    // RULE 1: GLOBAL IDENTITY FIRST
    const billingGateApplies = !isGlobalOperator;
    
    let effectiveMode: AccessContext['effectiveMode'] = 'NO_CONTEXT';
    
    if (isGlobalOperator) {
        // Superadmin/Creator bypasses all tenant-level read-only reasons for operational purposes
        effectiveMode = 'GLOBAL';
        readOnlyReason = 'NONE'; // Force NONE to avoid confusing UI messages in global mode
    } else if (activeOrgId) {
        effectiveMode = readOnlyReason === 'NONE' ? 'TENANT_RW' : 'TENANT_RO';
    }

    const context: AccessContext = {
        userId: user.id,
        email: email,
        globalRole,
        isCreator,
        isGlobalOperator,
        activeOrgId,
        localMembershipRole: localRole,
        subscriptionStatus: subStatus,
        trialEndsAt: trialEndsAtStr,
        billingGateApplies,
        readOnlyReason,
        effectiveMode,
        traceId
    };

    console.log(`[AccessResolver][${traceId}] RESOLVED: email=${email}, role=${globalRole}, creator=${isCreator}, mode=${effectiveMode}, org=${activeOrgId}, reason=${readOnlyReason}`);
    
    return context;
}
