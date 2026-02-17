'use client';

import { useDraggable } from '@dnd-kit/core';
import { Database } from '@/types/supabase';
import { Building2, Calendar, DollarSign, MoreHorizontal, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Opportunity = Database['public']['Tables']['Opportunity']['Row'] & {
    Client: {
        name: string;
    } | null;
};

interface Props {
    opportunity: Opportunity;
}

export function KanbanCard({ opportunity }: Props) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: opportunity.id,
        data: {
            ...opportunity,
            type: 'Opportunity'
        }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="bg-white p-4 rounded-lg shadow-xl border border-blue-200 opacity-80 rotate-2 cursor-grabbing z-50 h-[120px]"
            >
                <div className="font-bold text-zinc-900 line-clamp-2 text-sm">
                    {opportunity.title}
                </div>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="bg-white p-4 rounded-lg shadow-sm border border-zinc-100 cursor-grab hover:shadow-md transition-all active:cursor-grabbing group relative touch-none"
        >
            <div className="flex justify-between items-start mb-2">
                <Link prefetch={false} href={`/crm/opportunities/${opportunity.id}`} className="font-bold text-zinc-800 hover:text-blue-600 line-clamp-2 text-sm">
                    {opportunity.title}
                </Link>
            </div>

            <div className="space-y-2 mb-3">
                <div className="flex items-center text-xs text-zinc-500">
                    <Building2 className="w-3.5 h-3.5 mr-1.5 opacity-70 shrink-0" />
                    <span className="truncate font-medium">{opportunity.Client?.name || 'Sin Cliente'}</span>
                </div>
                <div className="flex items-center text-xs text-emerald-600 font-medium bg-emerald-50 w-fit px-2 py-0.5 rounded-md border border-emerald-100">
                    <DollarSign className="w-3 h-3 mr-1" />
                    <span className="font-mono">{formatMoney(opportunity.value || 0)}</span>
                </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-zinc-400 border-t pt-2 mt-1">
                <div className="flex flex-col gap-1">
                    <span className="flex items-center" title="Fecha de cierre esperada">
                        <Calendar className="w-3 h-3 mr-1 opacity-50" />
                        {opportunity.expectedCloseDate ? format(new Date(opportunity.expectedCloseDate), 'dd MMM', { locale: es }) : 'Sin fecha'}
                    </span>

                    {opportunity.nextInteractionDate && (
                        <span className={`flex items-center font-medium ${new Date(opportunity.nextInteractionDate) < new Date()
                            ? 'text-red-600'
                            : 'text-zinc-500'
                            }`} title="Próximo contacto">
                            <Clock className="w-3 h-3 mr-1" />
                            {format(new Date(opportunity.nextInteractionDate), 'dd MMM HH:mm', { locale: es })}
                        </span>
                    )}
                </div>

                <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
                    <Link href={`/crm/opportunities/${opportunity.id}`} className="hover:bg-zinc-100 p-1 rounded-md block">
                        <MoreHorizontal className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
