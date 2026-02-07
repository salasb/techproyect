'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Bell, Phone, Mail, CheckSquare, AlertTriangle, Clock } from 'lucide-react';

interface ActionItem {
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

interface ActionCenterProps {
    actions: ActionItem[];
}

export function ActionCenter({ actions }: ActionCenterProps) {
    if (actions.length === 0) {
        return (
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <CheckSquare className="w-6 h-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium text-foreground">¡Todo al día!</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                    No tienes acciones pendientes urgentes. Es un buen momento para revisar la planificación futura.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-xl shadow-lg border border-indigo-800 p-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Bell className="w-5 h-5 text-indigo-300" />
                            Acciones Recomendadas
                        </h3>
                        <p className="text-indigo-200 text-sm mt-1">
                            {actions.length} tareas requieren tu atención hoy.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {actions.slice(0, 5).map((action) => (
                        <div key={action.id} className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 transition-colors backdrop-blur-sm group">
                            <div className="flex items-start gap-3">
                                <div className={`mt-1 p-2 rounded-full shrink-0 ${action.type === 'BLOCKER' ? 'bg-red-500/20 text-red-200' :
                                        action.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-200' :
                                            'bg-indigo-500/20 text-indigo-200'
                                    }`}>
                                    {action.type === 'CALL' && <Phone className="w-3.5 h-3.5" />}
                                    {action.type === 'EMAIL' && <Mail className="w-3.5 h-3.5" />}
                                    {action.type === 'BLOCKER' && <AlertTriangle className="w-3.5 h-3.5" />}
                                    {action.type === 'TASK' && <CheckSquare className="w-3.5 h-3.5" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-300">
                                            {action.companyName}
                                        </span>
                                        {action.dueDate && (
                                            <span className={`text-[10px] flex items-center gap-1 ${action.isOverdue ? 'text-red-300 font-bold' : 'text-indigo-300'}`}>
                                                <Clock className="w-3 h-3" />
                                                {action.isOverdue ? 'Atrasado' : 'Para hoy'}
                                            </span>
                                        )}
                                    </div>

                                    <h4 className="text-sm font-medium text-white truncate pr-2 mt-0.5">
                                        {action.title}
                                    </h4>

                                    <p className="text-xs text-indigo-200/70 truncate mt-0.5">
                                        {action.projectName}
                                    </p>
                                </div>

                                <Link href={`/projects/${action.projectId}`} className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-1.5 hover:bg-white/10 rounded text-indigo-200 hover:text-white transition-colors">
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                {actions.length > 5 && (
                    <button className="w-full mt-4 py-2 text-xs text-indigo-300 hover:text-indigo-100 transition-colors border-t border-white/10">
                        Ver {actions.length - 5} acciones más
                    </button>
                )}
            </div>
        </div>
    );
}
