'use client';

import React from 'react';
import Link from 'next/link';
import {
    AlertTriangle,
    Phone,
    Mail,
    CheckSquare,
    ArrowRight,
    Clock,
    FileText,
    AlertOctagon
} from 'lucide-react';

// Reuse the ActionItem interface (or import it if it was shared)
// For now defining it here to match ActionCenter's data structure
export interface ActionItem {
    id: string;
    projectId: string;
    projectName: string;
    companyName: string;
    type: 'CALL' | 'EMAIL' | 'TASK' | 'BLOCKER';
    title: string;
    dueDate?: Date;
    isOverdue?: boolean;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface FocusBoardProps {
    actions: ActionItem[];
}

export function FocusBoard({ actions }: FocusBoardProps) {

    // 1. Group Actions
    const criticalActions = actions.filter(a => a.priority === 'HIGH' || a.type === 'BLOCKER');
    const commercialActions = actions.filter(a => (a.type === 'CALL' || a.type === 'EMAIL') && a.priority !== 'HIGH');
    const adminActions = actions.filter(a => a.type === 'TASK' && a.priority !== 'HIGH');

    // Helper to render a card
    const ActionCard = ({ action, colorClass, icon: Icon }: { action: ActionItem, colorClass: string, icon: any }) => (
        <Link href={`/projects/${action.projectId}`} className="block group">
            <div className={`bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorClass}`}></div>

                <div className="flex justify-between items-start mb-1 pl-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                            <Icon className="w-3.5 h-3.5 mr-1.5" />
                            {action.type === 'CALL' ? 'Llamada' : action.type === 'EMAIL' ? 'Correo' : action.type === 'BLOCKER' ? 'Bloqueo' : 'Tarea'}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-primary transition-colors" />
                    </div>
                </div>
            </div>
        </Link>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full">

            {/* Column 1: Critical / High Priority */}
            <div className="bg-zinc-50/50 dark:bg-zinc-900/20 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-semibold text-foreground flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                        Prioridad Alta
                    </h3>
                    <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs px-2 py-0.5 rounded-full font-bold">
                        {criticalActions.length}
                    </span>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {criticalActions.length > 0 ? (
                        criticalActions.map(action => (
                            <ActionCard
                                key={action.id}
                                action={action}
                                colorClass="bg-red-500"
                                icon={AlertOctagon}
                            />
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm italic">
                            No hay acciones críticas.
                        </div>
                    )}
                </div>
            </div>

            {/* Column 2: Commercial / Follow-up */}
            <div className="bg-zinc-50/50 dark:bg-zinc-900/20 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-semibold text-foreground flex items-center">
                        <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                        Gestión Comercial
                    </h3>
                    <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs px-2 py-0.5 rounded-full font-bold">
                        {commercialActions.length}
                    </span>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {commercialActions.length > 0 ? (
                        commercialActions.map(action => (
                            <ActionCard
                                key={action.id}
                                action={action}
                                colorClass="bg-purple-500"
                                icon={action.type === 'CALL' ? Phone : Mail}
                            />
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm italic">
                            Todo al día en comercial.
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: Admin / Tasks */}
            <div className="bg-zinc-50/50 dark:bg-zinc-900/20 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-semibold text-foreground flex items-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
                        Administración
                    </h3>
                    <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs px-2 py-0.5 rounded-full font-bold">
                        {adminActions.length}
                    </span>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {adminActions.length > 0 ? (
                        adminActions.map(action => (
                            <ActionCard
                                key={action.id}
                                action={action}
                                colorClass="bg-emerald-500"
                                icon={CheckSquare}
                            />
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm italic">
                            Sin tareas administrativas.
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
