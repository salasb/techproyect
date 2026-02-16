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
                <div className="flex p-1 bg-muted rounded-lg w-full">
                    <button
                        type="button"
                        onClick={() => setIsNewLead(false)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${!isNewLead ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Cliente Existente
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsNewLead(true)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${isNewLead ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
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
