'use client';

import { useEffect, useState } from 'react';
import { getProjectTimeline, TimelineEvent } from '@/actions/timeline';
import { ProjectLogsManager } from './ProjectLogsManager'; // Reuse input form
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Activity,
    AlertOctagon,
    Calendar,
    CheckCircle2,
    FileText,
    Flag,
    Mail,
    MessageSquare,
    Phone,
    RefreshCcw,
    User,
    Shield
} from 'lucide-react';

interface Props {
    projectId: string;
}

export function UnifiedTimeline({ projectId }: Props) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    async function loadData() {
        setIsLoading(true);
        try {
            const data = await getProjectTimeline(projectId);
            setEvents(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [projectId]);

    // Refresh when a new note is added via ProjectLogsManager
    // We can wrap ProjectLogsManager to trigger a refresh, or just add a refresh button for now

    const getIcon = (event: TimelineEvent) => {
        if (event.type === 'SYSTEM') return <Shield className="w-4 h-4 text-zinc-500" />;
        if (event.type === 'BLOCKER') return <AlertOctagon className="w-4 h-4 text-red-500" />;
        if (event.type === 'MILESTONE') return <Flag className="w-4 h-4 text-emerald-500" />;
        if (event.type === 'INTERACTION') {
            if (event.iconType === 'CALL') return <Phone className="w-4 h-4 text-blue-500" />;
            if (event.iconType === 'EMAIL') return <Mail className="w-4 h-4 text-indigo-500" />;
            if (event.iconType === 'MEETING') return <Calendar className="w-4 h-4 text-purple-500" />;
        }
        return <MessageSquare className="w-4 h-4 text-amber-500" />; // Note
    };

    const getBgColor = (event: TimelineEvent) => {
        if (event.type === 'SYSTEM') return 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200';
        if (event.type === 'BLOCKER') return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900';
        if (event.type === 'MILESTONE') return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900';
        if (event.type === 'INTERACTION') return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900';
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Section - Reusing ProjectLogsManager for now, but ideally we'd strip it down */}
            <div className="lg:col-span-1">
                {/* Pass a dummy logs array since we don't display them here anymore */}
                {/* We need to modify ProjectLogsManager to accept an onUpdate callback if we want auto-refresh */}
                <div className="bg-muted/30 p-4 rounded-xl border border-dashed border-zinc-300">
                    <p className="text-sm text-center text-muted-foreground mb-4">
                        ¿Nueva actualización? Registra notas, hitos o bloqueos aquí.
                    </p>
                    {/* We render the manager just for the "Input" part. 
                        In a real refactor, we should extract the form. 
                        For now, the user has to refresh to see the new log in the timeline. 
                    */}
                    <ProjectLogsManager projectId={projectId} logs={[]} />
                    <button
                        onClick={loadData}
                        className="w-full mt-4 flex items-center justify-center p-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <RefreshCcw className="w-3 h-3 mr-2" />
                        Actualizar Timeline
                    </button>
                </div>
            </div>

            {/* Timeline Feed */}
            <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Actividad del Proyecto
                    </h3>
                    <span className="text-xs text-muted-foreground bg-zinc-100 px-2 py-1 rounded-full">
                        {events.length} eventos registrados
                    </span>
                </div>

                <div className="relative border-l-2 border-zinc-200 dark:border-zinc-800 ml-3 space-y-8 pb-12">
                    {isLoading ? (
                        <div className="pl-8 py-4 text-muted-foreground text-sm animate-pulse">Cargando historia...</div>
                    ) : events.length === 0 ? (
                        <div className="pl-8 py-4 text-muted-foreground text-sm italic">No hay actividad registrada.</div>
                    ) : (
                        events.map((event, index) => (
                            <div key={event.id} className="relative pl-8 group animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[11px] top-0 w-6 h-6 rounded-full border-4 border-white dark:border-zinc-950 flex items-center justify-center bg-white dark:bg-zinc-900 shadow-sm z-10`}>
                                    {getIcon(event)}
                                </div>

                                {/* Content Card */}
                                <div className={`p-4 rounded-xl border shadow-sm transition-all hover:shadow-md ${getBgColor(event)}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-foreground">{event.title}</span>
                                            {event.type === 'SYSTEM' && <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Sistema</span>}
                                        </div>
                                        <time className="text-xs text-muted-foreground tabular-nums">
                                            {format(new Date(event.date), "d MMM yyyy, HH:mm", { locale: es })}
                                        </time>
                                    </div>
                                    <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                                        {event.content}
                                    </p>
                                    {event.author && event.type === 'SYSTEM' && (
                                        <div className="mt-2 pt-2 border-t border-black/5 flex items-center text-xs text-muted-foreground">
                                            <User className="w-3 h-3 mr-1" />
                                            {event.author}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
