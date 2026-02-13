'use client';

import { Database } from "@/types/supabase";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachMonthOfInterval, isSameMonth, getMonth, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Project = Database['public']['Tables']['Project']['Row'] & {
    company: { name: string } | null;
};

interface Props {
    projects: Project[];
}

export function ProjectGantt({ projects }: Props) {
    if (projects.length === 0) return null;

    // Filter valid projects
    const activeProjects = projects.filter(p => p.status === 'EN_CURSO' && p.startDate && p.plannedEndDate);
    if (activeProjects.length === 0) return null;

    // Determine Timeline Range
    const dates = activeProjects.map(p => [new Date(p.startDate), new Date(p.plannedEndDate)]).flat();
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Pad range (1 month before and after)
    const startDate = startOfMonth(minDate);
    const endDate = endOfMonth(maxDate);

    // Generate Months Headers
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    // Calculate total days for grid columns
    const totalDays = differenceInDays(endDate, startDate) + 1;

    const getPosition = (date: string) => {
        const d = new Date(date);
        const diff = differenceInDays(d, startDate);
        return Math.max(0, Math.min(diff, totalDays)); // Clamp
    };

    const getWidth = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        const diff = differenceInDays(e, s);
        return Math.max(1, diff); // Minimum 1 day width
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'EN_CURSO': return 'bg-blue-500';
            case 'EN_ESPERA': return 'bg-amber-500';
            case 'CERRADO': return 'bg-emerald-500';
            case 'BLOQUEADO': return 'bg-red-500';
            default: return 'bg-zinc-500';
        }
    };

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-border flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                    📅 Cronograma de Proyectos
                </h3>
                <span className="text-xs text-muted-foreground">{activeProjects.length} proyectos activos</span>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative">
                <div className="min-w-[800px] p-4">
                    {/* Time Header */}
                    <div className="flex mb-4 sticky top-0 bg-background z-10 border-b border-border">
                        <div className="w-48 flex-shrink-0 font-medium text-xs text-muted-foreground p-2 bg-background z-20 sticky left-0 border-r border-border">
                            Proyecto
                        </div>
                        <div className="flex-1 flex relative h-8">
                            {months.map((month, i) => {
                                const daysInMonth = differenceInDays(endOfMonth(month), startOfMonth(month)) + 1;
                                const flexGrow = daysInMonth / totalDays;

                                return (
                                    <div key={i} className="flex-1 border-l border-zinc-200 dark:border-zinc-800 text-[10px] uppercase text-zinc-400 font-bold px-2 flex items-center truncate" style={{ flex: daysInMonth }}>
                                        {format(month, 'MMM yyyy', { locale: es })}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Project Rows */}
                    <div className="space-y-4 relative">
                        {/* Vertical Grid Lines (Background) */}
                        <div className="absolute inset-0 flex pl-48 pointer-events-none">
                            {months.map((month, i) => {
                                const daysInMonth = differenceInDays(endOfMonth(month), startOfMonth(month)) + 1;
                                return (
                                    <div key={i} className="flex-1 border-l border-zinc-100 dark:border-zinc-800/50 h-full" style={{ flex: daysInMonth }}></div>
                                )
                            })}
                        </div>

                        {activeProjects.map((project) => {
                            const startOffset = getPosition(project.startDate);
                            const duration = getWidth(project.startDate, project.plannedEndDate);

                            // Calculate percentages for positioning
                            const left = (startOffset / totalDays) * 100;
                            const width = (duration / totalDays) * 100;

                            return (
                                <div key={project.id} className="flex items-center group relative hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors">
                                    {/* Sidebar Project Name */}
                                    <div className="w-48 flex-shrink-0 p-2 pr-4 z-10 sticky left-0 bg-background group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/50 border-r border-border transition-colors">
                                        <Link href={`/projects/${project.id}`} className="block">
                                            <div className="font-semibold text-sm truncate text-foreground">{project.name}</div>
                                            <div className="text-xs text-muted-foreground truncate">{project.company?.name}</div>
                                        </Link>
                                    </div>

                                    {/* Bar Area */}
                                    <div className="flex-1 relative h-8 z-0 pl-1">
                                        <div
                                            className={`absolute top-1.5 h-5 rounded-md shadow-sm ${getStatusColor(project.status)} opacity-80 group-hover:opacity-100 transition-all cursor-pointer flex items-center px-2 overflow-hidden whitespace-nowrap`}
                                            style={{
                                                left: `${left}%`,
                                                width: `${width}%`,
                                                minWidth: '24px'
                                            }}
                                            title={`${format(new Date(project.startDate), 'dd/MM')} - ${format(new Date(project.plannedEndDate), 'dd/MM')}`}
                                        >
                                            <span className="text-[10px] font-bold text-white drop-shadow-md truncate">
                                                {Math.round(project.progress)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
