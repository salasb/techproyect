'use client'

import { Database } from "@/types/supabase";
import { updateClientStatus } from "@/actions/crm";
import { User, Phone, Mail, MapPin, Building2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

type Client = Database['public']['Tables']['Client']['Row'];

interface Props {
    client: Client;
}

export function ClientHeader({ client }: Props) {
    const [status, setStatus] = useState(client.status);
    const { toast } = useToast();

    async function handleStatusChange(newStatus: Database['public']['Enums']['ClientStatus']) {
        try {
            await updateClientStatus(client.id, newStatus);
            setStatus(newStatus);
            toast({ type: 'success', message: 'Estado actualizado' });
        } catch (error) {
            toast({ type: 'error', message: 'Error al actualizar estado' });
        }
    }

    const statusColors = {
        'LEAD': 'bg-blue-100 text-blue-700',
        'PROSPECT': 'bg-purple-100 text-purple-700',
        'CLIENT': 'bg-green-100 text-green-700',
        'CHURNED': 'bg-red-100 text-red-700' // Using red for churned
    };

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex items-start space-x-4">
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                        <Building2 className="w-8 h-8 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{client.name}</h1>
                        <div className="flex items-center space-x-2 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {client.taxId && <span>{client.taxId}</span>}
                            {client.address && (
                                <>
                                    <span>•</span>
                                    <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" />{client.address}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <select
                        value={status}
                        onChange={(e) => handleStatusChange(e.target.value as Database['public']['Enums']['ClientStatus'])}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border-0 cursor-pointer outline-none ring-2 ring-transparent focus:ring-zinc-400 ${statusColors[status] || 'bg-gray-100'}`}
                    >
                        <option value="LEAD">LEAD</option>
                        <option value="PROSPECT">PROSPECTO</option>
                        <option value="CLIENT">CLIENTE</option>
                        <option value="CHURNED">BAJA</option>
                    </select>
                    <p className="text-xs text-zinc-400">Desde {format(new Date(client.createdAt), 'dd MMM yyyy')}</p>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <div className="flex items-center space-x-3 text-sm">
                    <User className="w-4 h-4 text-zinc-400" />
                    <div>
                        <p className="text-xs text-zinc-500 uppercase font-medium">Contacto Principal</p>
                        <p className="text-zinc-900 dark:text-zinc-200">{client.contactName || 'No registrado'}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                    <Mail className="w-4 h-4 text-zinc-400" />
                    <div>
                        <p className="text-xs text-zinc-500 uppercase font-medium">Email</p>
                        <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline truncate block max-w-[200px]">{client.email || '-'}</a>
                    </div>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                    <Phone className="w-4 h-4 text-zinc-400" />
                    <div>
                        <p className="text-xs text-zinc-500 uppercase font-medium">Teléfono</p>
                        <a href={`tel:${client.phone}`} className="text-zinc-900 dark:text-zinc-200 hover:underline">{client.phone || '-'}</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
