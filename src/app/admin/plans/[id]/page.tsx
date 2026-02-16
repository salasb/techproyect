import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PlanForm } from "@/components/admin/PlanForm";
export default async function PlanEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let plan = null;
    let isNew = id === 'new';

    if (!isNew) {
        const supabase = await createClient();
        const { data } = await supabase.from('Plan').select('*').eq('id', id).single();
        if (data) {
            plan = {
                ...data,
                limits: data.limits as any,
                features: data.features as any
            };
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin/plans">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {isNew ? 'Crear Nuevo Plan' : `Editar Plan: ${plan?.name} `}
                    </h1>
                </div>
            </div>

            <PlanForm id={id} isNew={isNew} plan={plan} />
        </div>
    );
}
