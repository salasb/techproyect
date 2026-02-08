import { getClients } from "@/actions/clients";
import { PipelineBoard } from "@/components/crm/PipelineBoard";
import { KanbanSquare } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
    const clients = await getClients();

    return (
        <div className="flex flex-col h-full bg-zinc-100/50 dark:bg-black/20">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <KanbanSquare className="w-6 h-6 text-indigo-600" />
                        Pipeline de Oportunidades
                    </h1>
                    <p className="text-sm text-zinc-500">Gestión visual del estado de los clientes</p>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden px-6">
                <PipelineBoard clients={clients} />
            </div>
        </div>
    );
}
