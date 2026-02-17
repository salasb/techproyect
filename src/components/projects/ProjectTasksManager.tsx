'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, Calendar, AlertCircle, Clock } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { createTask, toggleTaskStatus, deleteTask } from '@/app/actions/tasks';
import { useToast } from '@/components/ui/Toast';

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: 'PENDING' | 'COMPLETED';
    dueDate: string | null;
    priority: number;
}

interface ProjectTasksManagerProps {
    projectId: string;
    tasks: Task[];
}

export function ProjectTasksManager({ projectId, tasks }: ProjectTasksManagerProps) {
    const { toast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', dueDate: '', priority: 0 });

    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.status === b.status) {
            // Priority first, then date
            if (b.priority !== a.priority) return b.priority - a.priority;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return a.status === 'PENDING' ? -1 : 1;
    });

    async function handleAddTask(e: React.FormEvent) {
        e.preventDefault();
        if (!newTask.title.trim()) return;

        setIsLoading(true);
        try {
            await createTask(projectId, {
                title: newTask.title,
                dueDate: newTask.dueDate || undefined,
                priority: newTask.priority
            });
            setNewTask({ title: '', dueDate: '', priority: 0 });
            setIsAdding(false);
            toast({ type: 'success', message: 'Tarea agregada' });
        } catch (error) {
            toast({ type: 'error', message: 'Error al agregar tarea' });
        } finally {
            setIsLoading(false);
        }
    }

    async function handleToggle(taskId: string, currentStatus: string) {
        try {
            await toggleTaskStatus(taskId, projectId, currentStatus);
        } catch (error) {
            toast({ type: 'error', message: 'Error al actualizar tarea' });
        }
    }

    async function handleDelete(taskId: string) {
        if (!confirm('¿Eliminar esta tarea?')) return;
        try {
            await deleteTask(taskId, projectId);
            toast({ type: 'info', message: 'Tarea eliminada' });
        } catch (error) {
            toast({ type: 'error', message: 'Error al eliminar tarea' });
        }
    }

    const openTasks = sortedTasks.filter(t => t.status === 'PENDING');
    const completedTasks = sortedTasks.filter(t => t.status === 'COMPLETED');

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-foreground flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
                    Tareas y Acciones ({openTasks.length})
                </h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded-md font-medium transition-colors flex items-center"
                >
                    <Plus className="w-3 h-3 mr-1" />
                    Nueva Tarea
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAddTask} className="bg-muted/30 border border-dashed border-border rounded-xl p-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-3">
                        <input
                            autoFocus
                            placeholder="¿Qué hay que hacer?"
                            className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-muted-foreground"
                            value={newTask.title}
                            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                            required
                        />
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center bg-background border border-border rounded-lg px-2 py-1">
                                <Calendar className="w-3 h-3 text-muted-foreground mr-2" />
                                <input
                                    type="date"
                                    className="bg-transparent border-none text-[11px] focus:ring-0 p-0"
                                    value={newTask.dueDate}
                                    onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setNewTask({ ...newTask, priority: newTask.priority === 1 ? 0 : 1 })}
                                    className={`text-[10px] px-2 py-1 rounded-md border transition-all ${newTask.priority === 1
                                        ? 'bg-red-50 border-red-200 text-red-600 font-bold'
                                        : 'bg-background border-border text-muted-foreground'
                                        }`}
                                >
                                    Alta Prioridad
                                </button>
                            </div>
                            <div className="flex-1" />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || !newTask.title.trim()}
                                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            )}

            <div className="space-y-2">
                {openTasks.length === 0 && !isAdding && (
                    <div className="text-center py-6 border border-dashed border-border rounded-xl">
                        <p className="text-xs text-muted-foreground italic">No hay tareas pendientes.</p>
                    </div>
                )}

                {openTasks.map(task => (
                    <TaskItem
                        key={task.id}
                        task={task}
                        onToggle={() => handleToggle(task.id, task.status)}
                        onDelete={() => handleDelete(task.id)}
                    />
                ))}

                {completedTasks.length > 0 && (
                    <div className="pt-2">
                        <button
                            className="text-[10px] text-muted-foreground hover:text-foreground mb-2 flex items-center uppercase tracking-wider font-bold"
                            onClick={() => { /* Toggle visibility of completed? For now just show them partially */ }}
                        >
                            Completadas ({completedTasks.length})
                        </button>
                        <div className="opacity-60 space-y-2">
                            {completedTasks.map(task => (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    onToggle={() => handleToggle(task.id, task.status)}
                                    onDelete={() => handleDelete(task.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TaskItem({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
    const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status === 'PENDING';
    const isTodayTask = task.dueDate && isToday(new Date(task.dueDate)) && task.status === 'PENDING';

    return (
        <div className={`group flex items-start gap-3 p-3 bg-card border border-border rounded-xl transition-all hover:border-primary/30 hover:shadow-sm ${task.status === 'COMPLETED' ? 'bg-muted/20' : ''}`}>
            <button
                onClick={onToggle}
                className={`mt-0.5 transition-colors ${task.status === 'COMPLETED' ? 'text-emerald-500' : 'text-muted-foreground hover:text-primary'}`}
            >
                {task.status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
            </button>

            <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${task.status === 'COMPLETED' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.priority === 1 && !task.status && <AlertCircle className="w-3 h-3 inline text-red-500 mr-1.5 -mt-0.5" />}
                    {task.title}
                </div>
                {task.dueDate && (
                    <div className={`text-[10px] mt-1 flex items-center font-medium ${isOverdue ? 'text-red-500' : isTodayTask ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        <Clock className="w-3 h-3 mr-1" />
                        {format(new Date(task.dueDate), "d 'de' MMM", { locale: es })}
                        {isOverdue && <span className="ml-1 uppercase font-bold text-[9px]">(Atrasada)</span>}
                        {isTodayTask && <span className="ml-1 uppercase font-bold text-[9px]">(Hoy)</span>}
                    </div>
                )}
            </div>

            <button
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
