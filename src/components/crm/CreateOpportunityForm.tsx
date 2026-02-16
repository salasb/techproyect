'use client';

import { useState, useTransition } from 'react';
import { createOpportunity } from '@/actions/opportunities';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { MoneyInput } from '@/components/ui/MoneyInput';

interface ClientOption {
    id: string;
    name: string;
}

interface ContactInput {
    name: string;
    role: string;
    email: string;
    phone: string;
}

interface Props {
    clients: ClientOption[];
}

export function CreateOpportunityForm({ clients }: Props) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [value, setValue] = useState(0);
    const [description, setDescription] = useState('');
    const [leadName, setLeadName] = useState('');
    const [leadEmail, setLeadEmail] = useState('');
    const [leadPhone, setLeadPhone] = useState('');
    const [contacts, setContacts] = useState<ContactInput[]>([]);

    async function handleSubmit(formData: FormData) {
        // Validation
        if (!title.trim()) {
            toast({ type: 'error', message: 'El título del trato es requerido' });
            return;
        }
        if (!leadName.trim()) {
            toast({ type: 'error', message: 'El nombre del prospecto es requerido' });
            return;
        }

        // Explicitly set values to ensure they are captured
        formData.set('title', title);
        formData.set('value', value.toString());
        formData.set('isNewLead', 'true');
        formData.set('leadName', leadName);
        formData.set('leadEmail', leadEmail);
        formData.set('leadPhone', leadPhone);
        formData.set('description', description);
        formData.set('contactsList', JSON.stringify(contacts));

        startTransition(async () => {
            try {
                const result = await createOpportunity(formData);
                if (result.success) {
                    toast({ type: 'success', message: 'Oportunidad creada exitosamente' });
                    router.push('/crm/pipeline');
                }
            } catch (error: any) {
                console.error("Creation error:", error);
                toast({
                    type: 'error',
                    message: error.message || 'Error al crear la oportunidad'
                });
            }
        });
    }

    return (
        <form action={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-card p-8 rounded-xl border border-border mt-8 shadow-sm">
            <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg h-fit">
                    <Save className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-base font-bold text-indigo-900 dark:text-indigo-100">Prospección Estratégica</h2>
                    <p className="text-xs text-indigo-800/80 dark:text-indigo-200/80 leading-relaxed">
                        Esta sección captura tu intención de contactar a un cliente potencial. Registra tu interacción inicial para que el sistema te recuerde realizar el seguimiento oportuno.
                    </p>
                </div>
            </div>

            <div className="space-y-5">
                <p className="text-[11px] text-red-500">* Campos obligatorios</p>
                {/* Title */}
                <div className="space-y-2">
                    <label htmlFor="title" className="text-sm font-medium text-foreground">
                        Título del Trato <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="title"
                        id="title"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ej: Implementación ERP Fase 1"
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-input transition-all"
                    />
                </div>

                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50 animate-in fade-in slide-in-from-top-1">
                    <div className="space-y-2">
                        <label htmlFor="leadName" className="text-sm font-medium text-foreground">
                            Empresa / Prospecto <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="leadName"
                            required
                            value={leadName}
                            onChange={(e) => setLeadName(e.target.value)}
                            placeholder="Nombre comercial"
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-input transition-all"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="lastContactDate" className="text-sm font-medium text-foreground">Fecha de Contacto <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                id="lastContactDate"
                                name="lastContactDate"
                                required
                                defaultValue={new Date().toISOString().split('T')[0]}
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-input transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="lastContactType" className="text-sm font-medium text-foreground">Medio de Contacto <span className="text-red-500">*</span></label>
                            <select
                                id="lastContactType"
                                name="lastContactType"
                                required
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-input transition-all"
                            >
                                <option value="EMAIL">Email enviado</option>
                                <option value="CALL">Llamada telefónica</option>
                                <option value="MEETING">Reunión / Visita</option>
                                <option value="WHATSAPP">WhatsApp</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="leadEmail" className="text-sm font-medium text-foreground">Email de Contacto</label>
                            <input
                                type="email"
                                id="leadEmail"
                                value={leadEmail}
                                onChange={(e) => setLeadEmail(e.target.value)}
                                placeholder="correo@ejemplo.com"
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-input transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="leadPhone" className="text-sm font-medium text-foreground">Teléfono</label>
                            <input
                                type="tel"
                                id="leadPhone"
                                value={leadPhone}
                                onChange={(e) => setLeadPhone(e.target.value)}
                                placeholder="+56 9..."
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-input transition-all"
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-border/30">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                                Contactos Adicionales
                            </label>
                            <button
                                type="button"
                                onClick={() => setContacts([...contacts, { name: '', role: '', email: '', phone: '' }])}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded"
                            >
                                + Añadir
                            </button>
                        </div>
                        <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                            {contacts.map((contact, index) => (
                                <div key={index} className="grid grid-cols-2 gap-2 p-2 bg-background rounded border border-border/50 relative group">
                                    <button
                                        type="button"
                                        onClick={() => setContacts(contacts.filter((_, i) => i !== index))}
                                        className="absolute -right-1.5 -top-1.5 p-0.5 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Loader2 className="w-2.5 h-2.5 rotate-45" />
                                    </button>
                                    <input
                                        placeholder="Nombre"
                                        value={contact.name}
                                        onChange={(e) => {
                                            const newContacts = [...contacts];
                                            newContacts[index].name = e.target.value;
                                            setContacts(newContacts);
                                        }}
                                        className="text-[10px] p-1 rounded border border-input bg-muted/20"
                                    />
                                    <input
                                        placeholder="Cargo"
                                        value={contact.role}
                                        onChange={(e) => {
                                            const newContacts = [...contacts];
                                            newContacts[index].role = e.target.value;
                                            setContacts(newContacts);
                                        }}
                                        className="text-[10px] p-1 rounded border border-input bg-muted/20"
                                    />
                                    <input
                                        placeholder="Email"
                                        value={contact.email}
                                        onChange={(e) => {
                                            const newContacts = [...contacts];
                                            newContacts[index].email = e.target.value;
                                            setContacts(newContacts);
                                        }}
                                        className="text-[10px] p-1 rounded border border-input bg-muted/20"
                                    />
                                    <input
                                        placeholder="Teléfono"
                                        value={contact.phone}
                                        onChange={(e) => {
                                            const newContacts = [...contacts];
                                            newContacts[index].phone = e.target.value;
                                            setContacts(newContacts);
                                        }}
                                        className="text-[10px] p-1 rounded border border-input bg-muted/20"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground italic">Se creará automáticamente un registro de cliente como "Prospecto".</p>
                </div>

                {/* Value */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Valor Estimado</label>
                    <MoneyInput
                        value={value}
                        onValueChange={setValue}
                    />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium text-foreground">Descripción / Notas</label>
                    <textarea
                        name="description"
                        id="description"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-input transition-all resize-none"
                        placeholder="Detalles clave sobre la oportunidad..."
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center px-6 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Guardando...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Crear Oportunidad
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
