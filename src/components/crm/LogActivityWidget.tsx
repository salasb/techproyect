'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { logInteraction } from "@/actions/crm-activities";
import { Phone, Mail, Users, FileText, Calendar, Loader2, Save, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { format, addDays } from "date-fns";

interface LogActivityWidgetProps {
    opportunityId: string;
    onActivityLogged?: () => void;
}

type TabType = 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING';

export function LogActivityWidget({ opportunityId, onActivityLogged }: LogActivityWidgetProps) {
    const [activeTab, setActiveTab] = useState<TabType>('NOTE');
    const [notes, setNotes] = useState("");
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd HH:mm'));
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Auto-set follow-up to 7 days from now by default
    const [followUpDate, setFollowUpDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd HH:mm'));

    const quickActions = [
        { label: 'Contactado', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />, note: 'Contactado exitosamente. Se envió información.', type: 'CALL' as TabType },
        { label: 'Sin Respuesta', icon: <XCircle className="w-4 h-4 text-red-500" />, note: 'Intento de contacto sin respuesta. Volver a intentar.', type: 'CALL' as TabType },
        { label: 'Agendar Reunión', icon: <Calendar className="w-4 h-4 text-indigo-600" />, note: 'Reunión agendada para presentar propuesta.', type: 'MEETING' as TabType },
    ];

    const applyQuickAction = (action: typeof quickActions[0]) => {
        setNotes(action.note);
        setActiveTab(action.type);
    };

    async function handleSubmit() {
        if (!notes.trim()) {
            toast({ type: 'error', message: "Por favor escribe una nota o selecciona una acción rápida" });
            return;
        }

        setLoading(true);
        try {
            const formData = {
                opportunityId,
                type: activeTab,
                notes,
                date: new Date(date).toISOString(),
                nextFollowUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined
            };

            const result = await logInteraction(formData);

            if (result.success) {
                toast({ type: 'success', message: "Actividad registrada y seguimiento programado" });
                setNotes("");
                // Reset follow-up to +7 days from NEW now
                setFollowUpDate(format(addDays(new Date(), 7), 'yyyy-MM-dd HH:mm'));
                if (onActivityLogged) onActivityLogged();
            } else {
                toast({ type: 'error', message: "Error al registrar actividad" });
            }
        } catch (error) {
            console.error(error);
            toast({ type: 'error', message: "Ocurrió un error inesperado" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100 bg-slate-50/50">
                <TabButton
                    active={activeTab === 'NOTE'}
                    onClick={() => setActiveTab('NOTE')}
                    icon={<FileText className="w-4 h-4" />}
                    label="Nota"
                />
                <TabButton
                    active={activeTab === 'CALL'}
                    onClick={() => setActiveTab('CALL')}
                    icon={<Phone className="w-4 h-4" />}
                    label="Llamada"
                />
                <TabButton
                    active={activeTab === 'EMAIL'}
                    onClick={() => setActiveTab('EMAIL')}
                    icon={<Mail className="w-4 h-4" />}
                    label="Correo"
                />
                <TabButton
                    active={activeTab === 'MEETING'}
                    onClick={() => setActiveTab('MEETING')}
                    icon={<Users className="w-4 h-4" />}
                    label="Reunión"
                />
            </div>

            <div className="p-4 space-y-4">
                {/* Quick Actions */}
                <div className="flex gap-2 pb-2 overflow-x-auto">
                    {quickActions.map((action, idx) => (
                        <button
                            key={idx}
                            onClick={() => applyQuickAction(action)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap"
                        >
                            {action.icon}
                            {action.label}
                        </button>
                    ))}
                </div>

                <Textarea
                    placeholder={`Escribe los detalles de la ${activeTab === 'CALL' ? 'llamada' : activeTab === 'EMAIL' ? 'correo' : activeTab === 'MEETING' ? 'reunión' : 'actividad'}...`}
                    className="min-h-[100px] bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />

                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100 bg-indigo-50/30 -mx-4 px-4 py-3 mt-2">
                    <div className="flex-1">
                        <label className="text-xs font-semibold text-indigo-900 mb-1 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-600" />
                            Recordatorio Automático (+7 días)
                        </label>
                        <Input
                            type="datetime-local"
                            className="w-full text-sm bg-white border-indigo-100 focus:ring-indigo-500"
                            value={followUpDate}
                            onChange={(e) => setFollowUpDate(e.target.value)}
                        />
                    </div>
                    <div className="flex items-end">
                        <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition-all active:scale-95">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Guardar Actividad
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all
                ${active
                    ? 'text-indigo-600 bg-white border-b-2 border-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}
