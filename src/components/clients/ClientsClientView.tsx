'use client'

import { useState } from "react";
import { createClientAction, deleteClientAction, updateClientAction } from "@/actions/clients";
import { Plus, Search, MapPin, Phone, Mail, FileText, User, Trash2, Edit2, Loader2, X } from "lucide-react";
import { formatRut, validateRut } from "@/lib/rut";

export function ClientsClientView({ initialClients }: { initialClients: any[] }) {
    const [clients, setClients] = useState(initialClients);
    const [isAdding, setIsAdding] = useState(false);
    const [editingClient, setEditingClient] = useState<any | null>(null);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
    );

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        try {
            if (editingClient) {
                await updateClientAction(editingClient.id, formData);
            } else {
                await createClientAction(formData);
            }
            // Ideally we'd optimize allowing optimistic updates, but for now full refresh via server actions revalidation is fine.
            // However, since we received initialClients as prop, we depend on page refresh or router.refresh() 
            // In a real app we might verify if revalidatePath updates 'clients' prop automatically (it does in Server Components if we refresh).
            // For now let's just reload to update the view or trust the parent re-renders.
            // A simple hack is forcing a page reload or using router.refresh()
            window.location.reload();
        } catch (error) {
            alert("Error al guardar cliente");
        } finally {
            setIsLoading(false);
            setIsAdding(false);
            setEditingClient(null);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("¿Eliminar cliente?")) return;
        try {
            await deleteClientAction(id);
            window.location.reload();
        } catch (error) {
            alert("Error al eliminar");
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        className="pl-9 pr-4 py-2 w-full rounded-lg border border-input bg-background text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Cliente
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map((client) => (
                    <div key={client.id} className="group bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-foreground text-lg">{client.name}</h3>
                                {client.taxId && (
                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                        <FileText className="w-3 h-3 mr-1" />
                                        {client.taxId}
                                    </div>
                                )}
                            </div>
                            <div className="flex bg-muted/50 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingClient(client); setIsAdding(true); }} className="p-1.5 text-zinc-500 hover:text-blue-600 rounded">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(client.id)} className="p-1.5 text-zinc-500 hover:text-red-600 rounded">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            {client.contactName && (
                                <div className="flex items-center text-zinc-600 dark:text-zinc-400">
                                    <User className="w-4 h-4 mr-2" />
                                    {client.contactName}
                                </div>
                            )}
                            {client.email && (
                                <div className="flex items-center text-zinc-600 dark:text-zinc-400">
                                    <Mail className="w-4 h-4 mr-2" />
                                    {client.email}
                                </div>
                            )}
                            {client.phone && (
                                <div className="flex items-center text-zinc-600 dark:text-zinc-400">
                                    <Phone className="w-4 h-4 mr-2" />
                                    {client.phone}
                                </div>
                            )}
                            {client.address && (
                                <div className="flex items-center text-zinc-600 dark:text-zinc-400">
                                    <MapPin className="w-4 h-4 mr-2" />
                                    <span className="truncate">{client.address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Form */}
            {(isAdding || editingClient) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl border border-border flex flex-col">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h3 className="font-bold text-lg">{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                            <button onClick={() => { setIsAdding(false); setEditingClient(null); }} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form action={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre / Razón Social <span className="text-red-500">*</span></label>
                                <input name="name" required defaultValue={editingClient?.name} className="w-full p-2 rounded-lg border border-input bg-background" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">RUT / Tax ID</label>
                                    <input
                                        name="taxId"
                                        defaultValue={editingClient?.taxId}
                                        className="w-full p-2 rounded-lg border border-input bg-background font-mono"
                                        placeholder="12.345.678-9"
                                        onChange={(e) => {
                                            // Auto-format on type
                                            const formatted = formatRut(e.target.value);
                                            // Only update if it's a valid partial format or deleted
                                            e.target.value = formatted;
                                        }}
                                        onBlur={(e) => {
                                            if (e.target.value && !validateRut(e.target.value)) {
                                                alert("El RUT ingresado no es válido");
                                                // e.target.focus(); // Optional: force fix
                                            }
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Teléfono</label>
                                    <input name="phone" defaultValue={editingClient?.phone} className="w-full p-2 rounded-lg border border-input bg-background" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input name="email" type="email" defaultValue={editingClient?.email} className="w-full p-2 rounded-lg border border-input bg-background" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Dirección</label>
                                <input name="address" defaultValue={editingClient?.address} className="w-full p-2 rounded-lg border border-input bg-background" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre Contacto</label>
                                <input name="contactName" defaultValue={editingClient?.contactName} className="w-full p-2 rounded-lg border border-input bg-background" />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => { setIsAdding(false); setEditingClient(null); }} className="px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">Cancelar</button>
                                <button type="submit" disabled={isLoading} className="px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 flex items-center">
                                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
