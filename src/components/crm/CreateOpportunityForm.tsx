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

    async function handleSubmit(formData: FormData) {
        // Validation
        if (!clientId) {
            toast({ type: 'error', message: 'Debes seleccionar un cliente' });
            return;
        }

        // Add additional controlled fields to FormData if needed
        // Since we use controlled inputs for some (like MoneyInput), we need to ensure they are in FormData or pass them manually.
        // Server action expects FormData, so we append manual values if not present in native form elements.
        formData.set('value', value.toString());
        formData.set('clientId', clientId);

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

            <div className="space-y-4">
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

                {/* Client Selection */}
                <div className="space-y-2">
                    <label htmlFor="client" className="text-sm font-medium text-foreground">
                        Cliente / Empresa <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="client"
                        name="clientId" // Creates native select for FormData if needed, but we control it locally too
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
                    <p className="text-xs text-muted-foreground">¿No encuentras al cliente? <a href="/clients/new" className="text-primary hover:underline">Regístralo primero</a>.</p>
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
                        rows={4}
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
                    className="flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
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
