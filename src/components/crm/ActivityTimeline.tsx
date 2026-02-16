'use client';

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Phone, Mail, Users, FileText, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Interaction = {
    id: string;
    type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';
    notes: string;
    date: string;
    createdAt: string;
};

interface ActivityTimelineProps {
    interactions: Interaction[];
}

export function ActivityTimeline({ interactions }: ActivityTimelineProps) {
    if (interactions.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground border-l-2 border-slate-100 ml-4 pl-8">
                <p>No hay interacciones registradas aún.</p>
            </div>
        );
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'CALL': return <Phone className="h-4 w-4" />;
            case 'EMAIL': return <Mail className="h-4 w-4" />;
            case 'MEETING': return <Users className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'CALL': return 'bg-blue-100 text-blue-600 border-blue-200';
            case 'EMAIL': return 'bg-purple-100 text-purple-600 border-purple-200';
            case 'MEETING': return 'bg-amber-100 text-amber-600 border-amber-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    return (
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            {interactions.map((interaction) => (
                <div key={interaction.id} className="relative flex group items-start gap-4 mx-4">
                    <div className={`absolute left-0 mt-1 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm z-10 ${getColor(interaction.type)} bg-white`}>
                        {getIcon(interaction.type)}
                    </div>
                    <div className="flex-1 ml-10 bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-medium text-slate-900 capitalize text-sm">
                                {interaction.type === 'CALL' ? 'Llamada' :
                                    interaction.type === 'EMAIL' ? 'Correo' :
                                        interaction.type === 'MEETING' ? 'Reunión' : 'Nota'}
                            </h4>
                            <time className="text-xs text-slate-500">
                                {format(new Date(interaction.date), "d MMM yyyy, HH:mm", { locale: es })}
                            </time>
                        </div>
                        <p className="text-slate-600 text-sm whitespace-pre-wrap">{interaction.notes}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
