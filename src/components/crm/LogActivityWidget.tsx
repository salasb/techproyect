'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { logInteraction, scheduleFollowUp } from "@/actions/crm-activities";
import { Phone, Mail, Users, FileText, Calendar, Loader2, Save } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { format } from "date-fns";

interface LogActivityWidgetProps {
    opportunityId: string;
    onActivityLogged?: () => void;
}

type TabType = 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING';

export function LogActivityWidget({ opportunityId, onActivityLogged }: LogActivityWidgetProps) {
    const [activeTab, setActiveTab] = useState<TabType>('NOTE');
    const [notes, setNotes] = useState("");
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd HH:mm')); // Simplified datetime local
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Follow-up state
    const [followUpDate, setFollowUpDate] = useState("");

    async function handleSubmit() {
        if (!notes.trim()) {
            toast({ type: 'error', message: "Por favor escribe una nota" });
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
                toast({ type: 'success', message: "Actividad registrada correctamente" });
                setNotes("");
                setFollowUpDate("");
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
                <div>
                    {/* Simplified Date Picker for Interaction Time - Default Now */}
                    {/* Hidden logic: use current time if not adjusted, or simple input */}
                </div>

                <Textarea
                    placeholder={`Escribe los detalles de la ${activeTab === 'CALL' ? 'llamada' : activeTab === 'EMAIL' ? 'correo' : activeTab === 'MEETING' ? 'reunión' : 'nota'}...`}
                    className="min-h-[100px] bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />

                <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-slate-100">
                    <div className="flex-1">
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Próximo Contacto (Recordatorio)</label>
                        <Input
                            type="datetime-local"
                            className="w-full text-sm"
                            value={followUpDate}
                            onChange={(e) => setFollowUpDate(e.target.value)}
                        />
                    </div>
                    <div className="flex items-end">
                        <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Registrar
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
