'use server'

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";

type CompanyUpdate = Database['public']['Tables']['Company']['Update'];

export async function updateCompany(companyId: string, data: CompanyUpdate) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('Company')
        .update(data)
        .eq('id', companyId);

    if (error) {
        throw new Error(`Error updating company: ${error.message}`);
    }

    revalidatePath('/projects/[id]', 'page'); // Revalidate project pages
}
