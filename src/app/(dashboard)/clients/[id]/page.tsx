import { getClientDetails } from "@/actions/crm";
import { ClientHeader } from "@/components/clients/ClientHeader";
import { ContactsList } from "@/components/clients/ContactsList";
import { InteractionsTimeline } from "@/components/clients/InteractionsTimeline";
import Link from "next/link";
import { ChevronLeft, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    try {
        const { client, contacts, interactions, projects } = await getClientDetails(params.id);

        return (
            <div className="p-8 space-y-8 max-w-7xl mx-auto">
                <Link href="/clients" className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Volver a Clientes
                </Link>

                <ClientHeader client={client} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content (Left, 2 cols) */}
                    <div className="lg:col-span-2 space-y-8">
                        <ContactsList clientId={client.id} contacts={contacts} />

                        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                            <InteractionsTimeline
                                clientId={client.id}
                                interactions={interactions}
                                projects={projects}
                            />
                        </div>
                    </div>

                    {/* Sidebar (Right, 1 col) */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                                <FolderOpen className="w-5 h-5 text-blue-500" />
                                Proyectos ({projects.length})
                            </h3>

                            {projects.length === 0 ? (
                                <p className="text-sm text-zinc-400 italic">No hay proyectos asociados.</p>
                            ) : (
                                <div className="space-y-3">
                                    {projects.map(project => (
                                        <Link key={project.id} href={`/projects/${project.id}`} className="block group">
                                            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 border border-transparent hover:border-blue-200 transition-all">
                                                <div className="font-medium text-sm text-zinc-900 dark:text-zinc-200 group-hover:text-blue-700">
                                                    {project.name}
                                                </div>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${project.status === 'EN_CURSO' ? 'bg-blue-100 text-blue-700' :
                                                        project.status === 'CERRADO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {project.status.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400">
                                                        {format(new Date(project.updatedAt), 'd MMM', { locale: es })}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
                                <Link href="/projects/new" className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
                                    + Nuevo Proyecto
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        return (
            <div className="p-8 space-y-8 max-w-7xl mx-auto">
                <Link href="/clients" className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Volver a Clientes
                </Link>
                <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg text-center">
                    <h3 className="font-bold text-lg mb-2">Error al cargar cliente</h3>
                    <p className="mb-4">No se pudo encontrar la información del cliente o el ID es inválido.</p>
                </div>
            </div>
        );
    }
}
