'use client';

import { useState } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    eachDayOfInterval
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, Building2 } from 'lucide-react';
import { Database } from '@/types/supabase';
import Link from 'next/link';

type Opportunity = Database['public']['Tables']['Opportunity']['Row'] & {
    Client: { name: string } | null;
};

interface Props {
    opportunities: Opportunity[];
}

export function CRMCalendar({ opportunities }: Props) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const getEventsForDay = (day: Date) => {
        const events: { type: 'followup' | 'closing', opportunity: Opportunity }[] = [];

        opportunities.forEach(opp => {
            if (opp.nextInteractionDate && isSameDay(new Date(opp.nextInteractionDate), day)) {
                events.push({ type: 'followup', opportunity: opp });
            }
            if (opp.expectedCloseDate && isSameDay(new Date(opp.expectedCloseDate), day)) {
                events.push({ type: 'closing', opportunity: opp });
            }
        });

        return events;
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/20">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 first-letter:uppercase">
                        {format(currentMonth, 'MMMM yyyy', { locale: es })}
                    </h2>
                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-1">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors">
                            <ChevronLeft className="w-4 h-4 text-zinc-600" />
                        </button>
                        <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-xs font-semibold text-zinc-600 hover:text-indigo-600 transition-colors">
                            Hoy
                        </button>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors">
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                        </button>
                    </div>
                </div>

                <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-zinc-500">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                        Seguimientos
                    </div>
                    <div className="flex items-center gap-1.5 font-medium text-zinc-500">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                        Cierres
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/40">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                        <div key={day} className="py-2 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest border-r border-zinc-200 dark:border-zinc-800 last:border-0">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 auto-rows-fr h-full">
                    {calendarDays.map((day, idx) => {
                        const dayEvents = getEventsForDay(day);
                        const isSelectedMonth = isSameMonth(day, monthStart);
                        const isToday = isSameDay(day, new Date());

                        return (
                            <div
                                key={day.toString()}
                                className={`min-h-[120px] p-2 border-r border-b border-zinc-200 dark:border-zinc-800 transition-colors ${!isSelectedMonth ? 'bg-zinc-50/50 dark:bg-black/10 opacity-40' : 'bg-white dark:bg-zinc-900'
                                    } ${idx % 7 === 6 ? 'border-r-0' : ''}`}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-500'
                                        }`}>
                                        {format(day, 'd')}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    {dayEvents.map((event, eIdx) => (
                                        <Link
                                            key={`${event.opportunity.id}-${eIdx}`}
                                            href={`/crm/opportunities/${event.opportunity.id}`}
                                            className={`block p-1.5 rounded-lg text-[10px] font-medium border transition-all hover:scale-[1.02] active:scale-95 shadow-sm active:shadow-none truncate ${event.type === 'followup'
                                                    ? 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100'
                                                    : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                                }`}
                                        >
                                            <div className="flex items-center gap-1">
                                                {event.type === 'followup' ? <Clock className="w-2.5 h-2.5 shrink-0" /> : <CalendarIcon className="w-2.5 h-2.5 shrink-0" />}
                                                <span className="truncate">{event.opportunity.title}</span>
                                            </div>
                                            <div className="mt-0.5 opacity-60 flex items-center gap-1">
                                                <Building2 className="w-2.5 h-2.5 shrink-0" />
                                                <span className="truncate">{event.opportunity.Client?.name}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
