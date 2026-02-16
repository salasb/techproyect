'use client';

import { useState, useTransition } from 'react';
import { updateOpportunity } from '@/actions/opportunities';
import { useToast } from '@/components/ui/Toast';
import { Loader2, Save, X } from 'lucide-react';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Database } from '@/types/supabase';

type Opportunity = Database['public']['Tables']['Opportunity']['Row'];

interface Props {
    opportunity: Opportunity;
    isOpen: boolean;
    onClose: () => void;
}

export function EditOpportunityModal({ opportunity, isOpen, onClose }: Props) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [title, setTitle] = useState(opportunity.title);
    const [value, setValue] = useState(opportunity.value || 0);
    const [description, setDescription] = useState(opportunity.description || '');
    const [expectedCloseDate, setExpectedCloseDate] = useState(opportunity.expectedCloseDate ? new Date(opportunity.expectedCloseDate).toISOString().split('T')[0] : '');
    const [nextInteractionDate, setNextInteractionDate] = useState(opportunity.nextInteractionDate ? new Date(opportunity.nextInteractionDate).toISOString().split('T')[0] : '');

    if (!isOpen) return null;

    async function handleSubmit(formData: FormData) {
        formData.set('value', value.toString());

        startTransition(async () => {
            try {
                await updateOpportunity(opportunity.id, formData);
                toast({ type: 'success', message: 'Oportunidad actualizada exitosamente' });
                onClose();
            } catch (error) {
                toast({ type: 'error', message: 'Error al actualizar la oportunidad' });
            }
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Editar Oportunidad</h2>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                <form action={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="title" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Título del Trato <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="title"
                                id="title"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Valor Estimado</label>
                                <MoneyInput
                                    value={value}
                                    onValueChange={setValue}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="expectedCloseDate" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Fecha de Cierre</label>
                                <input
                                    type="date"
                                    name="expectedCloseDate"
                                    id="expectedCloseDate"
                                    value={expectedCloseDate}
                                    onChange={(e) => setExpectedCloseDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="nextInteractionDate" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Próximo Seguimiento</label>
                            <input
                                type="date"
                                name="nextInteractionDate"
                                id="nextInteractionDate"
                                value={nextInteractionDate}
                                onChange={(e) => setNextInteractionDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="description" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Descripción</label>
                            <textarea
                                name="description"
                                id="description"
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
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
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
