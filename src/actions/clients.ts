'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getClients() {
    const supabase = await createClient();
    // We fetch from Company table as this currently represents the clients in the system
    const { data, error } = await supabase.from('Company').select('*').order('name');
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

    const { error } = await supabase.from('Company').insert({
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

    const { error } = await supabase.from('Company').update({
        name,
        email,
        phone,
        address,
        taxId,
        contactName,
        // Company table might not have updatedAt based on type definition, checking...
        // Checked Types: Company doesn't have updatedAt in Row definition! Remove it.
    }).eq('id', clientId);

    if (error) throw new Error(error.message);
    revalidatePath('/clients');
}

export async function deleteClientAction(clientId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('Company').delete().eq('id', clientId);
    if (error) throw new Error(error.message);
    revalidatePath('/clients');
}
