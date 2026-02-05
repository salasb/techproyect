'use server'

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";

type CostCategory = Database['public']['Enums']['CostCategory'];

export async function addCost(projectId: string, formData: FormData) {
    const description = formData.get("description") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const category = formData.get("category") as CostCategory;
    const date = formData.get("date") as string;

    if (!description || !amount || !category || !date) {
        throw new Error("Faltan campos requeridos");
    }

    const supabase = await createClient();

    const { error } = await supabase
        .from('CostEntry')
        .insert({
            id: crypto.randomUUID(),
            projectId,
            description,
            amountNet: amount,
            category,
            date: new Date(date).toISOString(),
        });

    if (error) {
        throw new Error(`Error al agregar costo: ${error.message}`);
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/');
    revalidatePath('/projects');
}

export async function deleteCost(projectId: string, costId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('CostEntry')
        .delete()
        .eq('id', costId);

    if (error) {
        throw new Error(`Error al eliminar costo: ${error.message}`);
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/');
    revalidatePath('/projects');
}

export async function updateCost(projectId: string, costId: string, formData: FormData) {
    const description = formData.get("description") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const category = formData.get("category") as CostCategory;
    const date = formData.get("date") as string;

    if (!description || !amount || !category || !date) {
        throw new Error("Faltan campos requeridos");
    }

    const supabase = await createClient();

    const { error } = await supabase
        .from('CostEntry')
        .update({
            description,
            amountNet: amount,
            category,
            date: new Date(date).toISOString(),
        })
        .eq('id', costId);

    if (error) {
        throw new Error(`Error al actualizar costo: ${error.message}`);
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/');
    revalidatePath('/projects');
}
