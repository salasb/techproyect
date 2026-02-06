'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateRut, cleanRut, formatRut } from "@/lib/rut";

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
    const taxIdRaw = formData.get('taxId') as string;
    const contactName = formData.get('contactName') as string;

    // Server-side Validation
    let taxId = taxIdRaw;
    if (taxIdRaw && taxIdRaw.trim() !== '') {
        if (!validateRut(taxIdRaw)) {
            throw new Error(`RUT inválido: ${taxIdRaw}`);
        }
        // Save standardized format
        taxId = formatRut(taxIdRaw);
    }

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
    const taxIdRaw = formData.get('taxId') as string;
    const contactName = formData.get('contactName') as string;

    // Server-side Validation
    let taxId = taxIdRaw;
    if (taxIdRaw && taxIdRaw.trim() !== '') {
        if (!validateRut(taxIdRaw)) {
            throw new Error(`RUT inválido: ${taxIdRaw}`);
        }
        taxId = formatRut(taxIdRaw);
    }

    const { error } = await supabase.from('Company').update({
        name,
        email,
        phone,
        address,
        taxId,
        contactName,
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
