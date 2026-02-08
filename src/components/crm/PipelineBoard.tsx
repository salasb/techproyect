'use client';

import { useState, useTransition } from 'react';
import { Database } from '@/types/supabase';
import { updateClientStatus } from '@/actions/crm';
import { useToast } from '@/components/ui/Toast';
import { MoreHorizontal, Phone, Mail, User, Loader2 } from 'lucide-react';
import Link from 'next/link';

type Client = Database['public']['Tables']['Client']['Row'];

interface Props {
    clients: Client[];
}

const COLUMNS: { id: Database['public']['Enums']['ClientStatus']; label: string; color: string }[] = [
    { id: 'LEAD', label: 'Prospecto', color: 'bg-blue-50 border-blue-200' },
    { id: 'PROSPECT', label: 'En Negociación', color: 'bg-purple-50 border-purple-200' },
    { id: 'CLIENT', label: 'Ganado / Cliente', color: 'bg-green-50 border-green-200' },
    { id: 'CHURNED', label: 'Perdido / Baja', color: 'bg-red-50 border-red-200' },
];

export function PipelineBoard({ clients: initialClients }: Props) {
    const [clients, setClients] = useState(initialClients);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [draggedClientId, setDraggedClientId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, clientId: string) => {
        setDraggedClientId(clientId);
        e.dataTransfer.effectAllowed = 'move';
        // Set transparent drag image or similar if needed, default is usually fine
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, status: Database['public']['Enums']['ClientStatus']) => {
        e.preventDefault();
        if (!draggedClientId) return;

        const client = clients.find(c => c.id === draggedClientId);
        if (!client || client.status === status) return;

        // Optimistic Update
        const previousClients = [...clients];
        setClients(clients.map(c => c.id === draggedClientId ? { ...c, status } : c));

        try {
            await updateClientStatus(draggedClientId, status);
            toast({ type: 'success', message: 'Estado actualizado' });
        } catch (error) {
            // Revert
            setClients(previousClients);
            toast({ type: 'error', message: 'Error al mover la tarjeta' });
        } finally {
            setDraggedClientId(null);
        }
    };

    return (
        <div className="flex h-full gap-4 overflow-x-auto pb-4">
            {COLUMNS.map(col => {
                const colClients = clients.filter(c => c.status === col.id);
                return (
                    <div
                        key={col.id}
                        className={`flex-shrink-0 w-80 flex flex-col rounded-xl border ${col.color}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        <div className="p-4 border-b border-black/5 flex justify-between items-center bg-white/50 rounded-t-xl">
                            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-700">{col.label}</h3>
                            <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-zinc-500 shadow-sm">
                                {colClients.length}
                            </span>
                        </div>

                        <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[200px]">
                            {colClients.map(client => (
                                <div
                                    key={client.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, client.id)}
                                    className="bg-white p-4 rounded-lg shadow-sm border border-zinc-100 cursor-move hover:shadow-md transition-all active:scale-95 group relative"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <Link href={`/clients/${client.id}`} className="font-bold text-zinc-800 hover:text-blue-600 line-clamp-2">
                                            {client.name}
                                        </Link>
                                    </div>

                                    <div className="space-y-1.5 mb-3">
                                        {client.contactName && (
                                            <div className="flex items-center text-xs text-zinc-500">
                                                <User className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                                <span className="truncate">{client.contactName}</span>
                                            </div>
                                        )}
                                        {client.phone && (
                                            <div className="flex items-center text-xs text-zinc-500">
                                                <Phone className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                                <span className="truncate">{client.phone}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] text-zinc-400 border-t pt-2 mt-2">
                                        <span>{new Date(client.updatedAt).toLocaleDateString()}</span>
                                        <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
                                            <Link href={`/clients/${client.id}`} className="hover:bg-zinc-100 p-1 rounded-md block">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
