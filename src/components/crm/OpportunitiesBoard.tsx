'use client';

import { useState, useTransition } from 'react';
import { Database } from '@/types/supabase';
import { updateOpportunityStage, OpportunityStage } from '@/actions/opportunities';
import { useToast } from '@/components/ui/Toast';
import { MoreHorizontal, DollarSign, Building2, Calendar, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

export function OpportunitiesBoard({ opportunities: initialOpportunities }: Props) {
    const [opportunities, setOpportunities] = useState(initialOpportunities);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [draggedOppId, setDraggedOppId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, oppId: string) => {
        setDraggedOppId(oppId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, stage: OpportunityStage) => {
        e.preventDefault();
        if (!draggedOppId) return;

        const opp = opportunities.find(o => o.id === draggedOppId);
        if (!opp || opp.stage === stage) return;

        // Optimistic Update
        const previousOpportunities = [...opportunities];
        setOpportunities(opportunities.map(o => o.id === draggedOppId ? { ...o, stage } : o));

        try {
            await updateOpportunityStage(draggedOppId, stage);
            toast({ type: 'success', message: 'Etapa actualizada' });
        } catch (error) {
            // Revert
            setOpportunities(previousOpportunities);
            toast({ type: 'error', message: 'Error al mover el trato' });
        } finally {
            setDraggedOppId(null);
        }
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    return (
        <div className="flex h-full gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {COLUMNS.map(col => {
                const colOpps = opportunities.filter(o => o.stage === col.id);
                const totalValue = colOpps.reduce((sum, o) => sum + Number(o.value), 0);

                return (
                    <div
                        key={col.id}
                        className={`flex-shrink-0 w-80 flex flex-col rounded-xl border ${col.color} bg-opacity-50`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        <div className="p-3 border-b border-black/5 flex flex-col gap-1 bg-white/50 rounded-t-xl backdrop-blur-sm">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-700">{col.label}</h3>
                                <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-zinc-500 shadow-sm border border-zinc-100">
                                    {colOpps.length}
                                </span>
                            </div>
                            {totalValue > 0 && (
                                <div className="text-xs font-medium text-zinc-500 flex items-center">
                                    <span className="mr-1">Total:</span>
                                    <span className="font-mono text-zinc-700">{formatMoney(totalValue)}</span>
                                </div>
                            )}
                        </div>

                        <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[200px]">
                            {colOpps.map(opp => (
                                <div
                                    key={opp.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, opp.id)}
                                    className="bg-white p-4 rounded-lg shadow-sm border border-zinc-100 cursor-move hover:shadow-md transition-all active:scale-[0.98] group relative"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <Link href={`/crm/opportunities/${opp.id}`} className="font-bold text-zinc-800 hover:text-blue-600 line-clamp-2 text-sm">
                                            {opp.title}
                                        </Link>
                                    </div>

                                    <div className="space-y-2 mb-3">
                                        <div className="flex items-center text-xs text-zinc-500">
                                            <Building2 className="w-3.5 h-3.5 mr-1.5 opacity-70 shrink-0" />
                                            <span className="truncate font-medium">{opp.Client?.name || 'Sin Cliente'}</span>
                                        </div>
                                        <div className="flex items-center text-xs text-emerald-600 font-medium bg-emerald-50 w-fit px-2 py-0.5 rounded-md border border-emerald-100">
                                            <DollarSign className="w-3 h-3 mr-1" />
                                            <span className="font-mono">{formatMoney(opp.value || 0)}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] text-zinc-400 border-t pt-2 mt-1">
                                        <span className="flex items-center" title="Fecha de cierre esperada">
                                            <Calendar className="w-3 h-3 mr-1 opacity-50" />
                                            {opp.expectedCloseDate ? format(new Date(opp.expectedCloseDate), 'dd MMM', { locale: es }) : 'Sin fecha'}
                                        </span>
                                        <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
                                            <Link href={`/crm/opportunities/${opp.id}`} className="hover:bg-zinc-100 p-1 rounded-md block">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {colOpps.length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed border-zinc-200 rounded-lg opacity-50">
                                    <span className="text-xs text-zinc-400">Sin tratos</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
