import { getOpportunities } from "@/actions/opportunities";
import { CRMCalendar } from "@/components/crm/CRMCalendar";
import { Calendar, KanbanSquare } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function CRMCalendarPage() {
    const opportunities = await getOpportunities();

    return (
        <div className="flex flex-col h-full bg-zinc-100/50 dark:bg-black/20">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-10 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                        Calendario de Seguimiento
                    </h1>
                    <p className="text-sm text-zinc-500">Próximos contactos y cierres esperados</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <Link href="/crm/pipeline" className="flex-1 sm:flex-none">
                        <button className="w-full flex items-center justify-center px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-semibold rounded-lg hover:bg-zinc-50 transition-all">
                            <KanbanSquare className="w-4 h-4 mr-2" />
                            Ver Pipeline
                        </button>
                    </Link>
                </div>
            </div>

            <div className="flex-1 p-6 overflow-hidden">
                <CRMCalendar opportunities={opportunities} />
            </div>
        </div>
    );
}
