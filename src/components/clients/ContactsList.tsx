'use client'

import { Database } from "@/types/supabase";
import { addContact } from "@/actions/crm";
import { UserPlus, Mail, Phone, Briefcase } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

type Contact = Database['public']['Tables']['Contact']['Row'];

interface Props {
    clientId: string;
    contacts: Contact[];
}

export function ContactsList({ clientId, contacts }: Props) {
    const [isAdding, setIsAdding] = useState(false);
    const { toast } = useToast();

    async function handleSubmit(formData: FormData) {
        try {
            await addContact(clientId, formData);
            toast({ type: 'success', message: 'Contacto agregado' });
            setIsAdding(false);
        } catch (error) {
            toast({ type: 'error', message: 'Error al agregar contacto' });
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-500" />
                    Contactos
                </h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    {isAdding ? 'Cancelar' : '+ Agregar'}
                </button>
            </div>

            {isAdding && (
                <form action={handleSubmit} className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input name="name" placeholder="Nombre completo" required className="p-2 rounded border bg-white dark:bg-zinc-900 text-sm" />
                        <input name="role" placeholder="Cargo / Rol" className="p-2 rounded border bg-white dark:bg-zinc-900 text-sm" />
                        <input name="email" type="email" placeholder="Email" className="p-2 rounded border bg-white dark:bg-zinc-900 text-sm" />
                        <input name="phone" placeholder="Teléfono" className="p-2 rounded border bg-white dark:bg-zinc-900 text-sm" />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700">Guardar Contacto</button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contacts.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-zinc-400 text-sm italic">
                        No hay contactos registrados adicionales.
                    </div>
                ) : (
                    contacts.map(contact => (
                        <div key={contact.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-zinc-800 dark:text-zinc-200">{contact.name}</h4>
                                {contact.role && (
                                    <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" /> {contact.role}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-1 text-sm text-zinc-500">
                                {contact.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5" />
                                        <a href={`mailto:${contact.email}`} className="hover:text-blue-500 truncate">{contact.email}</a>
                                    </div>
                                )}
                                {contact.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5" />
                                        <a href={`tel:${contact.phone}`} className="hover:text-blue-500">{contact.phone}</a>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
