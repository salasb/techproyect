'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAuditLog(projectId: string, action: string, details: string, userName: string = "Usuario") {
    const supabase = await createClient();

    const { error } = await supabase
        .from('AuditLog')
        .insert({
            projectId,
            action,
            details,
            userName,
            createdAt: new Date().toISOString()
        });

    if (error) {
        console.error("Error creating audit log:", error);
        throw new Error("Failed to create audit log");
    }

    revalidatePath(`/projects/${projectId}`);
}
