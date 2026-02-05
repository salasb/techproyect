'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getClients() {
    const supabase = await createClient();
    const { data, error } = await supabase.from('Client').select('*').order('name');
    if (error) throw new Error(error.message);
    return data;
}

export async function createClientAction(formData: FormData) {
    const supabase = await createClient();

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;
    const taxId = formData.get('taxId') as string;
    const contactName = formData.get('contactName') as string;

    const { error } = await supabase.from('Client').insert({
        name,
        email,
        phone,
        address,
        taxId,
        contactName
    });

    if (error) throw new Error(error.message);
    revalidatePath('/clients');
}

export async function updateClientAction(clientId: string, formData: FormData) {
    const supabase = await createClient();

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;
    const taxId = formData.get('taxId') as string;
    const contactName = formData.get('contactName') as string;

    const { error } = await supabase.from('Client').update({
        name,
        email,
        phone,
        address,
        taxId,
        contactName,
        updatedAt: new Date().toISOString()
    }).eq('id', clientId);

    if (error) throw new Error(error.message);
    revalidatePath('/clients');
}

export async function deleteClientAction(clientId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('Client').delete().eq('id', clientId);
    if (error) throw new Error(error.message);
    revalidatePath('/clients');
}
