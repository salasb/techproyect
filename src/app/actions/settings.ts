'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getSettings() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('Settings')
        .select('*')
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("Error fetching settings:", error);
        return null;
    }
    return data;
}

export async function updateSettings(data: { isSoloMode?: boolean; currency?: string; vatRate?: number }) {
    const supabase = await createClient();

    // First, check if settings exist
    const { data: existing } = await supabase.from('Settings').select('id').single();

    let result;
    if (existing) {
        result = await supabase
            .from('Settings')
            .update(data)
            .eq('id', existing.id);
    } else {
        result = await supabase
            .from('Settings')
            .insert(data);
    }

    if (result.error) {
        console.error("Error updating settings:", result.error);
        throw new Error("No se pudo actualizar la configuración");
    }

    revalidatePath('/', 'layout');
    return { success: true };
}

export async function toggleSoloMode(enabled: boolean) {
    return await updateSettings({ isSoloMode: enabled });
}
