'use server'

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";

export async function upsertPlan(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Security Check
    const { data: profile } = await supabase.from('Profile').select('role').eq('id', user?.id).single();
    if (!isSuperAdmin(profile?.role)) {
        throw new Error("Unauthorized");
    }

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const description = formData.get('description') as string;
    const isActive = formData.get('isActive') === 'on';

    // Parse Limits
    const limits = {
        maxUsers: parseInt(formData.get('maxUsers') as string) || 0,
        maxProjects: parseInt(formData.get('maxProjects') as string) || 0,
        maxStorageGB: parseInt(formData.get('maxStorageGB') as string) || 0,
    };

    // Parse Features
    const features = {
        supportLevel: formData.get('supportLevel') as string,
        canAccessAPI: formData.get('canAccessAPI') === 'on',
        canRemoveBranding: formData.get('canRemoveBranding') === 'on',
        customDomain: formData.get('customDomain') === 'on',
    };

    const planData = {
        name,
        description,
        price,
        isActive,
        limits,
        features,
        updatedAt: new Date().toISOString()
    };

    if (id && id !== 'new') {
        const { error } = await supabase
            .from('Plan')
            .update(planData)
            .eq('id', id);

        if (error) throw new Error(error.message);
    } else {
        // Create new
        const newId = formData.get('newId') as string || name.toUpperCase().replace(/\s+/g, '_');
        const { error } = await supabase
            .from('Plan')
            .insert({
                id: newId,
                ...planData,
                createdAt: new Date().toISOString()
            });

        if (error) throw new Error(error.message);
    }

    revalidatePath('/admin/plans');
    revalidatePath('/settings/billing'); // Update tenant views too
    return { success: true };
}
