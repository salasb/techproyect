'use client';

import { CheckCircle2, AlertTriangle, Calendar, Phone, Mail, FileText } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface TaskItem {
    id: string;
    type: 'CALL' | 'EMAIL' | 'TASK' | 'BLOCKER';
    title: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    dueDate?: Date | string;
    projectName: string;
    companyName: string;
    projectId: string;
}

export function TasksWidget({ tasks }: { tasks: TaskItem[] }) {
    const getIcon = (type: string) => {
        switch (type) {
            case 'CALL': return <Phone className="w-4 h-4 text-blue-500" />;
            case 'EMAIL': return <Mail className="w-4 h-4 text-purple-500" />;
            case 'BLOCKER': return <AlertTriangle className="w-4 h-4 text-red-500" />;
            default: return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        }
    };

    const formatDate = (date: Date | string | undefined) => {
        if (!date) return 'Sin fecha';
        return new Date(date).toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'short'
        });
    };

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm flex flex-col h-full">
            <div className="p-4 border-b border-border flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Tareas Pendientes
                </h3>
                <Badge variant="secondary" className="text-xs font-normal">
                    {tasks.length}
                </Badge>
            </div>
            <div className="flex-1 overflow-auto max-h-[300px]">
                {tasks.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                        No hay tareas pendientes.
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {tasks.map((task) => (
                            <div key={task.id} className="p-3 hover:bg-muted/30 transition-colors">
                                <Link href={`/projects/${task.projectId}`} className="flex items-start gap-3 group">
                                    <div className="mt-1 bg-background p-1.5 rounded-full border border-border shadow-sm">
                                        {getIcon(task.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                            {task.title}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                            <span className="truncate max-w-[120px]">{task.companyName}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(task.dueDate)}
                                            </span>
                                        </div>
                                    </div>
                                    {task.priority === 'HIGH' && (
                                        <span className="w-2 h-2 rounded-full bg-red-500 mt-2" title="Alta Prioridad" />
                                    )}
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
