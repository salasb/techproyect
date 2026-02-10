'use client';

import React from 'react';
import Link from 'next/link';
import {
    AlertOctagon,
    Clock,
    ArrowRight,
    Calendar,
    Briefcase
} from 'lucide-react';

// Reuse types or define them here if simpler for now
export interface ActionItem {
    id: string;
    projectId: string;
    projectName: string;
    companyName: string;
    type: 'CALL' | 'EMAIL' | 'TASK' | 'BLOCKER';
    title: string;
    dueDate?: string; // Changed from Date to string
    isOverdue?: boolean;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RecentProject {
    id: string;
    name: string;
    companyName: string;
    updatedAt: string;
    status: string;
}

export interface DeadlineItem {
    id: string;
    title: string;
    date: string; // Changed from Date to string
    type: 'INVOICE' | 'DELIVERY' | 'MEETING';
    entityName: string;
    subtext?: string;
    link?: string;
}

interface FocusBoardProps {
    alerts: ActionItem[];
    recentProjects: RecentProject[];
    upcomingDeadlines: DeadlineItem[];
}

export function FocusBoard({ alerts, recentProjects, upcomingDeadlines }: FocusBoardProps) {

    // Helper to render an Alert Card
    const AlertCard = ({ action }: { action: ActionItem }) => (
        <Link href={`/projects/${action.projectId}`} className="block group">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>

                <div className="flex justify-between items-start mb-1 pl-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[120px]">
                        {action.companyName}
                    </span>
                    {action.isOverdue && (
                        <span className="text-[10px] font-bold text-red-500 flex items-center bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                            <Clock className="w-3 h-3 mr-1" /> Atrasado
                        </span>
                    )}
                </div>

                <div className="pl-2">
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {action.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-2 line-clamp-1">
                        {action.projectName}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-50 dark:border-zinc-800">
                        <div className="flex items-center text-xs text-muted-foreground">
                            <AlertOctagon className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                            Prioridad Alta
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-primary transition-colors" />
                    </div>
                </div>
            </div>
        </Link>
    );

    // Helper for Recent Project Card
    const ProjectCard = ({ project }: { project: RecentProject }) => (
        <Link href={`/projects/${project.id}`} className="block group">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 relative">
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {project.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {project.companyName}
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-50 dark:border-zinc-800">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border
                        ${project.status === 'EN_CURSO' ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300' :
                            project.status === 'EN_ESPERA' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300' :
                                'bg-zinc-50 text-zinc-600 border-zinc-100 dark:bg-zinc-800'}`}>
                        {project.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                </div>
            </div>
        </Link>
    );

    // Helper for Deadline Card
    const DeadlineCard = ({ item }: { item: DeadlineItem }) => {
        const daysLeft = Math.ceil((new Date(item.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        const isUrgent = daysLeft <= 3;

        return (
            <Link href={item.link || '#'} className={`block group ${!item.link ? 'cursor-default' : ''}`}>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 relative border-l-4 border-l-indigo-500">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[120px]">
                            {item.entityName}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center ${isUrgent ? 'text-amber-600 bg-amber-50' : 'text-zinc-500 bg-zinc-100'}`}>
                            {daysLeft === 0 ? 'Hoy' : daysLeft < 0 ? 'Vencido' : `${daysLeft} días`}
                        </span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {item.title}
                    </h4>
                    {item.subtext && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {item.subtext}
                        </p>
                    )}
                    <div className="mt-2 text-[10px] text-muted-foreground flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(item.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full">

            {/* Column 1: Critical Alerts (Preserved) */}
            <div className="bg-zinc-50/50 dark:bg-zinc-900/20 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-semibold text-foreground flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                        Atención Requerida
                    </h3>
                    <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs px-2 py-0.5 rounded-full font-bold">
                        {alerts.length}
                    </span>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {alerts.length > 0 ? (
                        alerts.map(action => (
                            <AlertCard key={action.id} action={action} />
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm italic">
                            No hay alertas críticas.
                        </div>
                    )}
                </div>
            </div>

            {/* Column 2: Recent Projects (New) */}
            <div className="bg-zinc-50/50 dark:bg-zinc-900/20 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-semibold text-foreground flex items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                        Proyectos Recientes
                    </h3>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {recentProjects.length > 0 ? (
                        recentProjects.map(p => (
                            <ProjectCard key={p.id} project={p} />
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm italic">
                            Sin actividad reciente.
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: Upcoming Deadlines (New) */}
            <div className="bg-zinc-50/50 dark:bg-zinc-900/20 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-semibold text-foreground flex items-center">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></div>
                        Próximos Eventos
                    </h3>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {upcomingDeadlines.length > 0 ? (
                        upcomingDeadlines.map(item => (
                            <DeadlineCard key={item.id} item={item} />
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm italic">
                            Nada programado para los próximos 7 días.
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
