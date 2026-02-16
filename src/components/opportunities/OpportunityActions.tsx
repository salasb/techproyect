'use client';

import { useState, useTransition } from 'react';
import { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { EditOpportunityModal } from '@/components/opportunities/EditOpportunityModal';
import { deleteOpportunity, updateOpportunityStage } from '@/actions/opportunities';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Loader2, Trash2 } from 'lucide-react';

type Opportunity = Database['public']['Tables']['Opportunity']['Row'];

interface Props {
    opportunity: Opportunity;
}

export function OpportunityActions({ opportunity }: Props) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();

    const handleDelete = () => {
        startTransition(async () => {
            try {
                await deleteOpportunity(opportunity.id);
                toast({ type: 'success', message: 'Oportunidad eliminada' });
                router.push('/crm/pipeline');
            } catch (error) {
                toast({ type: 'error', message: 'Error al eliminar la oportunidad' });
            }
        });
    };

    const handleMarkWon = () => {
        startTransition(async () => {
            try {
                await updateOpportunityStage(opportunity.id, 'WON');
                toast({ type: 'success', message: '¡Felicidades! Oportunidad marcada como ganada' });
            } catch (error) {
                toast({ type: 'error', message: 'Error al actualizar etapa' });
            }
        });
    };

    return (
        <>
            <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setIsEditOpen(true)}>Editar</Button>

                {opportunity.stage !== 'WON' && opportunity.stage !== 'LOST' && (
                    <Button
                        onClick={handleMarkWon}
                        disabled={isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Marcar Ganada'}
                    </Button>
                )}

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsDeleteOpen(true)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            <EditOpportunityModal
                opportunity={opportunity}
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
            />

            <ConfirmDialog
                isOpen={isDeleteOpen}
                title="¿Está seguro de eliminar esta oportunidad?"
                description="Esta acción no se puede deshacer. Se eliminará permanentemente el registro del pipeline."
                onConfirm={handleDelete}
                onCancel={() => setIsDeleteOpen(false)}
                isLoading={isPending}
                confirmText="Eliminar"
                variant="danger"
            />
        </>
    );
}
