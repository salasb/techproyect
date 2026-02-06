'use server'

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createInvoice(projectId: string, formData: FormData) {
    const amountInvoicedGross = parseFloat(formData.get("amount") as string);
    const dueDateStr = formData.get("dueDate") as string;
    const paymentTerms = parseInt(formData.get("paymentTerms") as string) || 30;

    try {
        if (!amountInvoicedGross) {
            throw new Error("Monto requerido");
        }

        const supabase = await createClient();

        // Validate date
        let finalDueDate = null;
        if (dueDateStr) {
            const dateObj = new Date(dueDateStr);
            if (!isNaN(dateObj.getTime())) {
                finalDueDate = dateObj.toISOString();
            }
        }

        const { error } = await supabase
            .from('Invoice')
            .insert({
                id: crypto.randomUUID(),
                projectId,
                amountInvoicedGross,
                amountPaidGross: 0,
                sent: false,
                sentDate: null,
                dueDate: finalDueDate,
                paymentTermsDays: paymentTerms,
                updatedAt: new Date().toISOString()
            });

        if (error) {
            console.error("Supabase Error creating invoice:", error);
            throw new Error(`Error creando factura: ${error.message}`);
        }

        revalidatePath(`/projects/${projectId}`);
        revalidatePath('/');
        revalidatePath('/projects');
    } catch (e: any) {
        console.error("Server Action Error (createInvoice):", e);
        throw new Error(e.message || "Error interno al crear factura");
    }
}

export async function markInvoiceSent(projectId: string, invoiceId: string) {
    const supabase = await createClient();

    // Default to today as sent date
    const now = new Date();

    // We ideally need to recalculate due date based on terms if not set, 
    // but for now we set sent/sentDate.
    const { error } = await supabase
        .from('Invoice')
        .update({
            sent: true,
            sentDate: now.toISOString()
        })
        .eq('id', invoiceId);

    if (error) throw new Error(error.message);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/');
    revalidatePath('/projects');
}

export async function registerPayment(projectId: string, invoiceId: string, amount: number) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('Invoice')
        .update({
            amountPaidGross: amount // For now setting total. Partial payments Logic requires fetching first.
        })
        .eq('id', invoiceId);

    if (error) throw new Error(error.message);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/');
    revalidatePath('/projects');
}

export async function deleteInvoice(projectId: string, invoiceId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('Invoice').delete().eq('id', invoiceId);
    if (error) throw new Error(error.message);
    revalidatePath(`/projects/${projectId}`);
}
