import { createClient } from "@/lib/supabase/server";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewProjectPage() {
    const supabase = await createClient();

    // Fetch companies using Supabase SDK
    const { data: companiesData } = await supabase
        .from('Company')
        .select('*')
        .order('name', { ascending: true });

    // Ensure array even if fetch fails slightly
    const companies = companiesData || [];

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center space-x-4">
                <Link href="/projects" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Nuevo Proyecto</h1>
                    <p className="text-zinc-500">Rellena los datos para comenzar una nueva cotización.</p>
                </div>
            </div>

            <CreateProjectForm companies={companies} />
        </div>
    );
}
