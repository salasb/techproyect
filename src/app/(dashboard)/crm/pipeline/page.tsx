import { getOpportunities } from "@/actions/opportunities";
import { OpportunitiesBoard } from "@/components/crm/OpportunitiesBoard";
import { KanbanSquare, Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
    const opportunities = await getOpportunities();

    return (
        <div className="flex flex-col h-full bg-zinc-100/50 dark:bg-black/20">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center sticky top-0 z-10">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <KanbanSquare className="w-6 h-6 text-indigo-600" />
                        Pipeline de Oportunidades
                    </h1>
                    <p className="text-sm text-zinc-500">Gestión de tratos y ventas potenciales</p>
                </div>

                <Link href="/crm/opportunities/new">
                    <button className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Oportunidad
                    </button>
                </Link>
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="h-full p-6">
                    <OpportunitiesBoard opportunities={opportunities} />
                </div>
            </div>
        </div>
    );
}
