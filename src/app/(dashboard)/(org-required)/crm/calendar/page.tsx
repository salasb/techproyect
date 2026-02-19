import { getOpportunities } from "@/actions/opportunities";
import { CRMCalendar } from "@/components/crm/CRMCalendar";
import { Calendar, KanbanSquare } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function CRMCalendarPage() {
    const opportunities = await getOpportunities();

    return (
        <div className="flex flex-col h-full bg-zinc-100/50 dark:bg-black/20">
            <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10 shadow-sm px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                        Calendario CRM
                    </h1>
                    <p className="text-sm text-zinc-500">Planificación de seguimientos y cierres</p>
                </div>

                <div className="flex gap-2">
                    <Link href="/crm/pipeline">
                        <button className="flex items-center px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-semibold rounded-lg hover:bg-zinc-50 transition-all">
                            <KanbanSquare className="w-4 h-4 mr-2 text-indigo-600" />
                            Ver Pipeline
                        </button>
                    </Link>
                </div>
            </div>

            <div className="flex-1 p-6 overflow-hidden w-full mx-auto">
                <CRMCalendar opportunities={opportunities} />
            </div>
        </div>
    );
}
