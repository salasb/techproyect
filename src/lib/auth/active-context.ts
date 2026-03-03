import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { ORG_CONTEXT_COOKIE } from "./constants";

/**
 * Sets the active organization context for a user in both DB and Cookie.
 * v1.0: Canonical source of truth for organization switching.
 */
export async function setActiveOrg(userId: string, orgId: string, source: "select" | "auto" = "select") {
    console.log(`[ActiveContext] Setting active org for ${userId} -> ${orgId} (${source})`);
    
    // 1. Persist in DB (Source of Truth)
    await prisma.activeContext.upsert({
        where: { userId },
        create: { userId, orgId, source },
        update: { orgId, source, updatedAt: new Date() }
    });

    // 2. Set Cookie (Fast Access Cache)
    try {
        const cookieStore = await cookies();
        cookieStore.set(ORG_CONTEXT_COOKIE, orgId, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 1 week
        });
    } catch (e: any) {
        console.warn("[ActiveContext] Failed to set cookie (expected in some server contexts):", e.message);
    }
}

/**
 * Resolves the active organization for a user.
 * Priority: Cookie -> DB -> Null
 * v1.0: Guarantees that even if cookies are cleared (e.g. Vercel Preview domain hop), 
 * the context can be recovered from the database.
 */
export async function getActiveOrg(userId: string): Promise<string | null> {
    const cookieStore = await cookies();
    const cookieOrgId = cookieStore.get(ORG_CONTEXT_COOKIE)?.value;

    if (cookieOrgId) {
        return cookieOrgId;
    }

    // DB Fallback
    const context = await prisma.activeContext.findUnique({
        where: { userId },
        select: { orgId: true }
    });

    if (context?.orgId) {
        console.log(`[ActiveContext] Cookie missing for ${userId}. Recovered ${context.orgId} from DB.`);
        // Note: We don't rehydrate cookie here because getActiveOrg is often called 
        // in read-only Server Component renders where cookie writing is forbidden.
        return context.orgId;
    }

    return null;
}

/**
 * Clears the active organization context.
 */
export async function clearActiveOrg(userId: string) {
    await prisma.activeContext.deleteMany({
        where: { userId }
    });

    try {
        const cookieStore = await cookies();
        cookieStore.delete(ORG_CONTEXT_COOKIE);
    } catch (e) {}
}
