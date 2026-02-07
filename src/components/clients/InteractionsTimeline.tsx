'use client'

import { Database } from "@/types/supabase";
import { addInteraction } from "@/actions/crm";
import { History, MessageSquare, PhoneCall, Mail, Calendar, CalendarDays, Plus } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/components/ui/Toast";

type Interaction = Database['public']['Tables']['Interaction']['Row'] & {
    project?: { name: string } | null;
};
type Project = Database['public']['Tables']['Project']['Row'];

interface Props {
    clientId: string;
    interactions: Interaction[];
    projects: Project[];
}

export function InteractionsTimeline({ clientId, interactions, projects }: Props) {
    const [isAdding, setIsAdding] = useState(false);
    const { toast } = useToast();

    async function handleSubmit(formData: FormData) {
        try {
            await addInteraction(clientId, formData);
            toast({ type: 'success', message: 'Interacción registrada' });
            setIsAdding(false);
        } catch (error) {
            toast({ type: 'error', message: 'Error al registrar interacción' });
        }
    }

    const typeIcons = {
        'CALL': <PhoneCall className="w-4 h-4" />,
        'EMAIL': <Mail className="w-4 h-4" />,
        'MEETING': <CalendarDays className="w-4 h-4" />,
        'NOTE': <MessageSquare className="w-4 h-4" />
    };

    const typeLabels = {
        'CALL': 'Llamada',
        'EMAIL': 'Correo',
        'MEETING': 'Reunión',
        'NOTE': 'Nota'
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <History className="w-5 h-5 text-orange-500" />
                    Historial y Seguimiento
                </h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-1 text-sm bg-orange-50 text-orange-600 hover:bg-orange-100 px-3 py-1.5 rounded-full font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" /> Registrar Actividad
                </button>
            </div>

            {isAdding && (
                <form action={handleSubmit} className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <select name="type" className="p-2 rounded border bg-white dark:bg-zinc-900 text-sm">
                            <option value="NOTE">Nota / Comentario</option>
                            <option value="CALL">Llamada Telefónica</option>
                            <option value="EMAIL">Correo Electrónico</option>
                            <option value="MEETING">Reunión presencial/virtual</option>
                        </select>
                        <input name="date" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} className="p-2 rounded border bg-white dark:bg-zinc-900 text-sm" />
                    </div>
                    <select name="projectId" className="w-full p-2 rounded border bg-white dark:bg-zinc-900 text-sm">
                        <option value="">-- Sin Proyecto Asociado --</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <textarea name="notes" placeholder="Detalles de la interacción..." rows={3} className="w-full p-2 rounded border bg-white dark:bg-zinc-900 text-sm" required></textarea>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setIsAdding(false)} className="text-zinc-500 text-sm hover:underline px-3">Cancelar</button>
                        <button type="submit" className="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700">Guardar</button>
                    </div>
                </form>
            )}

            <div className="relative border-l-2 border-zinc-200 dark:border-zinc-800 ml-3 space-y-6 py-2">
                {interactions.length === 0 ? (
                    <div className="pl-6 text-zinc-400 text-sm italic">
                        No hay interacciones registradas.
                    </div>
                ) : (
                    interactions.map(interaction => (
                        <div key={interaction.id} className="relative pl-6">
                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center ${interaction.type === 'MEETING' ? 'bg-purple-500' :
                                    interaction.type === 'CALL' ? 'bg-blue-500' :
                                        interaction.type === 'EMAIL' ? 'bg-green-500' : 'bg-zinc-400'
                                }`}>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-sm flex items-center gap-1 ${interaction.type === 'MEETING' ? 'bg-purple-100 text-purple-700' :
                                                interaction.type === 'CALL' ? 'bg-blue-100 text-blue-700' :
                                                    interaction.type === 'EMAIL' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-700'
                                            }`}>
                                            {typeIcons[interaction.type]} {typeLabels[interaction.type]}
                                        </span>
                                        <span className="text-xs text-zinc-400">
                                            {format(new Date(interaction.date), "d MMM yyyy, HH:mm", { locale: es })}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line mb-2">
                                    {interaction.notes}
                                </p>
                                {interaction.project && (
                                    <div className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800 inline-block px-2 py-1 rounded">
                                        Ref: {interaction.project.name}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
