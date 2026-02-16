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
    const [clientId, setClientId] = useState('');
    const [value, setValue] = useState(0);
    const [description, setDescription] = useState('');
    const [isNewLead, setIsNewLead] = useState(false);
    const [leadName, setLeadName] = useState('');
    const [leadEmail, setLeadEmail] = useState('');
    const [leadPhone, setLeadPhone] = useState('');
    const [contacts, setContacts] = useState<ContactInput[]>([]);

    async function handleSubmit(formData: FormData) {
        // Validation
        if (!isNewLead && !clientId) {
            toast({ type: 'error', message: 'Debes seleccionar un cliente' });
            return;
        }

        if (isNewLead && !leadName) {
            toast({ type: 'error', message: 'Nombre del prospecto es requerido' });
            return;
        }

        formData.set('value', value.toString());
        formData.set('clientId', clientId);
        formData.set('isNewLead', isNewLead.toString());
        formData.set('leadName', leadName);
        formData.set('leadEmail', leadEmail);
        formData.set('leadPhone', leadPhone);
        formData.set('contactsList', JSON.stringify(contacts));

        startTransition(async () => {
            try {
                await createOpportunity(formData);
                toast({ type: 'success', message: 'Oportunidad creada exitosamente' });
                router.push('/crm/pipeline');
            } catch (error) {
                toast({ type: 'error', message: 'Error al crear la oportunidad' });
            }
        });
    }

    return (
        <form action={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-card p-8 rounded-xl border border-border mt-8 shadow-sm">
            <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Nueva Oportunidad</h2>
                <p className="text-sm text-muted-foreground">Registra un posible negocio para iniciar el seguimiento.</p>
                <p className="text-[11px] text-red-500 mt-2">* Campos obligatorios</p>
            </div>

            <div className="space-y-5">
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

                {/* Integration Toggle */}
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-full border border-border/50">
                    <button
                        type="button"
                        onClick={() => setIsNewLead(false)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!isNewLead
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
                            }`}
                    >
                        Cliente Existente
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsNewLead(true)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isNewLead
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
                            }`}
                    >
                        Nuevo Prospecto
                    </button>
                </div>

                {isNewLead ? (
                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50 animate-in fade-in slide-in-from-top-1">
                        <div className="space-y-2">
                            <label htmlFor="leadName" className="text-sm font-medium text-foreground">
                                Nombre de la Empresa / Contacto <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="leadName"
                                required={isNewLead}
                                value={leadName}
                                onChange={(e) => setLeadName(e.target.value)}
                                placeholder="Nombre comercial"
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-input transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="leadEmail" className="text-sm font-medium text-foreground">Email</label>
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
                                            <Loader2 className="w-2.5 h-2.5 rotate-45" /> {/* Using Loader2 as a cross replacement for simplicity or just use text 'x' if preferred */}
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
                ) : (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                        <label htmlFor="client" className="text-sm font-medium text-foreground">
                            Seleccionar Cliente <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="client"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-input transition-all"
                        >
                            <option value="">-- Seleccionar Cliente --</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>
                                    {client.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

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
