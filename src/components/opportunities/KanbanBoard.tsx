'use client';

import { useState } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    MouseSensor,
    TouchSensor,
    useDroppable,
    useSensor,
    useSensors,
    closestCorners
} from '@dnd-kit/core';
import { Database } from '@/types/supabase';
import { updateOpportunityStage, OpportunityStage } from '@/actions/opportunities';
import { useToast } from '@/components/ui/Toast';
import { KanbanCard } from './KanbanCard';

type Opportunity = Database['public']['Tables']['Opportunity']['Row'] & {
    Client: {
        name: string;
    } | null;
};

interface Props {
    opportunities: Opportunity[];
}

const COLUMNS: { id: OpportunityStage; label: string; color: string }[] = [
    { id: 'LEAD', label: 'Nuevo Lead', color: 'bg-blue-50 border-blue-200' },
    { id: 'QUALIFIED', label: 'Calificado', color: 'bg-indigo-50 border-indigo-200' },
    { id: 'PROPOSAL', label: 'Propuesta', color: 'bg-purple-50 border-purple-200' },
    { id: 'NEGOTIATION', label: 'Negociación', color: 'bg-orange-50 border-orange-200' },
    { id: 'WON', label: 'Cerrado Ganado', color: 'bg-emerald-50 border-emerald-200' },
    { id: 'LOST', label: 'Cerrado Perdido', color: 'bg-red-50 border-red-200' },
];

function KanbanColumn({ id, title, count, totalValue, children, color }: { id: string, title: string, count: number, totalValue: number, children: React.ReactNode, color: string }) {
    const { setNodeRef } = useDroppable({ id });

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    return (
        <div ref={setNodeRef} className={`flex-shrink-0 w-80 flex flex-col rounded-xl border ${color} bg-opacity-50 h-full`}>
            <div className="p-3 border-b border-black/5 flex flex-col gap-1 bg-white/50 rounded-t-xl backdrop-blur-sm">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-700">{title}</h3>
                    <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-zinc-500 shadow-sm border border-zinc-100">
                        {count}
                    </span>
                </div>
                {totalValue > 0 && (
                    <div className="text-xs font-medium text-zinc-500 flex items-center">
                        <span className="mr-1">Total:</span>
                        <span className="font-mono text-zinc-700">{formatMoney(totalValue)}</span>
                    </div>
                )}
            </div>
            <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[200px] custom-scrollbar">
                {children}
            </div>
        </div>
    );
}

export function KanbanBoard({ opportunities: initialOpportunities }: Props) {
    const [opportunities, setOpportunities] = useState(initialOpportunities);
    const [activeId, setActiveId] = useState<string | null>(null);
    const { toast } = useToast();

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string; // This is the column ID

        const activeOpp = opportunities.find(opt => opt.id === activeId);

        if (activeOpp && activeOpp.stage !== overId) {
            const newStage = overId as OpportunityStage;

            // Optimistic Update
            const oldOpportunities = [...opportunities];
            setOpportunities(prev => prev.map(opt =>
                opt.id === activeId ? { ...opt, stage: newStage } : opt
            ));

            try {
                await updateOpportunityStage(activeId, newStage);
                toast({ type: 'success', message: `Oportunidad movida a ${COLUMNS.find(c => c.id === newStage)?.label}` });
            } catch (error) {
                setOpportunities(oldOpportunities);
                toast({ type: 'error', message: "Error al actualizar la etapa" });
            }
        }

        setActiveId(null);
    };

    const activeOpportunity = activeId ? opportunities.find(opt => opt.id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full gap-4 overflow-x-auto pb-4 px-4 pt-2">
                {COLUMNS.map(col => {
                    const colOpps = opportunities.filter(o => o.stage === col.id);
                    const totalValue = colOpps.reduce((sum, o) => sum + Number(o.value), 0);

                    return (
                        <KanbanColumn
                            key={col.id}
                            id={col.id}
                            title={col.label}
                            count={colOpps.length}
                            totalValue={totalValue}
                            color={col.color}
                        >
                            {colOpps.map(opp => (
                                <KanbanCard key={opp.id} opportunity={opp} />
                            ))}
                            {colOpps.length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed border-zinc-200/50 rounded-lg opacity-50 mx-2">
                                    <span className="text-xs text-zinc-400">Arrastrar aquí</span>
                                </div>
                            )}
                        </KanbanColumn>
                    );
                })}
            </div>

            <DragOverlay>
                {activeOpportunity ? (
                    <div className="rotate-3 cursor-grabbing">
                        <KanbanCard opportunity={activeOpportunity} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
