import { getOpportunities } from "@/actions/opportunities";
import { KanbanBoard } from "@/components/opportunities/KanbanBoard";
import { KanbanSquare, Plus, Calendar } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
    const opportunities = await getOpportunities();

    return (
        <div className="flex flex-col h-full bg-zinc-100/50 dark:bg-black/20">
            <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <KanbanSquare className="w-6 h-6 text-indigo-600" />
                            Pipeline de Oportunidades
                        </h1>
                        <p className="text-sm text-zinc-500">Gestión de tratos y ventas potenciales</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Link href="/crm/calendar" className="w-full sm:w-auto">
                            <button className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-semibold rounded-lg hover:bg-zinc-50 transition-all">
                                <Calendar className="w-4 h-4 mr-2 text-indigo-600" />
                                Ver Calendario
                            </button>
                        </Link>
                        <Link href="/crm/opportunities/new" className="w-full sm:w-auto">
                            <button className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95">
                                <Plus className="w-4 h-4 mr-2" />
                                Nueva Oportunidad
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="h-full p-6 max-w-7xl mx-auto">
                    {opportunities.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white/50 dark:bg-zinc-900/50 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-full mb-4">
                                <KanbanSquare className="w-12 h-12 text-indigo-600" />
                            </div>
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Tu Pipeline está vacío</h2>
                            <p className="text-zinc-500 max-w-md mb-8">Comienza a registrar tus prospectos y posibles negocios para llevar un seguimiento detallado y aumentar tus ventas.</p>
                            <Link href="/crm/opportunities/new">
                                <button className="flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95">
                                    <Plus className="w-5 h-5 mr-1" />
                                    Crear Primera Oportunidad
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <KanbanBoard opportunities={opportunities} />
                    )}
                </div>
            </div>
        </div>
    );
}
