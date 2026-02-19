"use server";

import { ShareLinkService } from "@/services/share-link-service";
import { ShareLinkType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function createShareLinkAction(
    entityType: ShareLinkType,
    entityId: string,
    expiresInDays: number = 30
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Fetch Profile to get Organization
    const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        include: { organization: true }
    });

    if (!profile?.organizationId) {
        throw new Error("No organization found");
    }

    const url = await ShareLinkService.createLink(
        profile.organizationId,
        entityType,
        entityId,
        user.id,
        expiresInDays
    );

    // Revalidate the entity page to show the new link status if we add a list later
    revalidatePath(`/quotes/${entityId}`);
    revalidatePath(`/invoices/${entityId}`);

    return url;
}
