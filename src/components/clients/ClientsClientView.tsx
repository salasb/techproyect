"use client";

import { useState, useTransition } from "react";
import { createClientAction, deleteClientAction, updateClientAction } from "@/actions/clients";
import { Plus, Search, MapPin, Phone, Mail, User, Trash2, Edit2, Loader2, X, FileText, Eye, LayoutGrid, List } from "lucide-react";
import { formatRut, validateRut } from "@/lib/rut";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { PipelineBoard } from "@/components/crm/PipelineBoard";

export function ClientsClientView({ initialClients }: { initialClients: any[] }) {
    const [clients] = useState(initialClients); // We depend on server revalidation to update the list, but initial state is useful until then.
    // Ideally, we'd use useOptimistic here, but for now simple revalidation is fine.
    const [view, setView] = useState<'list' | 'board'>('list');

    const [isAdding, setIsAdding] = useState(false);
    const [editingClient, setEditingClient] = useState<any | null>(null);
    const [search, setSearch] = useState("");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { toast } = useToast();

    // Form State
    const [taxIdError, setTaxIdError] = useState<string | null>(null);
    const [phoneType, setPhoneType] = useState<'mobile' | 'landline'>('mobile');
    const [rawPhone, setRawPhone] = useState('');

    const filteredClients = initialClients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
    );

    async function handleSubmit(formData: FormData) {
        setTaxIdError(null);

        // Client-side Validation
        const taxId = formData.get('taxId') as string;
        if (taxId && !validateRut(taxId)) {
            setTaxIdError("RUT inválido. Formato esperado: 12.345.678-9");
            return;
        }

        startTransition(async () => {
            try {
                if (editingClient) {
                    await updateClientAction(editingClient.id, formData);
                    toast({ type: 'success', message: "Cliente actualizado correctamente" });
                } else {
                    await createClientAction(formData);
                    toast({ type: 'success', message: "Cliente creado correctamente" });
                }

                setIsAdding(false);
                setEditingClient(null);
                setTaxIdError(null);
                router.refresh();
            } catch (error: any) {
                console.error(error);
                // Extract error message if possible
                const msg = error.message?.includes("RUT inválido")
                    ? "El RUT ingresado no es válido."
                    : "Error al guardar cliente. Inténtalo nuevamente.";
                toast({ type: 'error', message: msg });
            }
        });
    }

    async function handleDelete(id: string) {
        if (!confirm("¿Eliminar cliente?")) return;

        startTransition(async () => {
            try {
                await deleteClientAction(id);
                toast({ type: 'success', message: "Cliente eliminado" });
                router.refresh();
            } catch (error) {
                toast({ type: 'error', message: "Error al eliminar cliente" });
            }
        });
    }

    const openModal = (client?: any) => {
        setEditingClient(client || null);
        setIsAdding(true);
        setTaxIdError(null);

        // Parse Phone Logic
        if (client?.phone) {
            const cleanPhone = client.phone.replace(/\s/g, ''); // Remove spaces
            if (cleanPhone.startsWith('+569') || cleanPhone.startsWith('9')) {
                setPhoneType('mobile');
                setRawPhone(cleanPhone.replace('+569', '').replace('+56', ''));
            } else if (cleanPhone.startsWith('+562') || cleanPhone.startsWith('2')) {
                setPhoneType('landline');
                setRawPhone(cleanPhone.replace('+562', '').replace('+56', ''));
            } else {
                // Fallback for non-standard numbers
                setPhoneType('mobile');
                setRawPhone(cleanPhone);
            }
        } else {
            setPhoneType('mobile');
            setRawPhone('');
        }
    };

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
                <div className="flex gap-2 bg-zinc-100 p-1 rounded-lg">
                    <button
                        onClick={() => setView('list')}
                        className={`p-2 rounded-md transition-all ${view === 'list' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                        title="Lista"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setView('board')}
                        className={`p-2 rounded-md transition-all ${view === 'board' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                        title="Tablero Kanban"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Cliente
                </button>
            </div>

            {view === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map((client) => (
                        <div key={client.id} className="group bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <Link href={`/clients/${client.id}`} className="hover:text-blue-600 transition-colors">
                                        <h3 className="font-bold text-foreground text-lg">{client.name}</h3>
                                    </Link>
                                    {client.taxId && (
                                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                                            <FileText className="w-3 h-3 mr-1" />
                                            {client.taxId}
                                        </div>
                                    )}
                                </div>
                                <div className="flex bg-muted/50 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link href={`/clients/${client.id}`} className="p-1.5 text-zinc-500 hover:text-blue-600 rounded" title="Ver Detalles">
                                        <Eye className="w-4 h-4" />
                                    </Link>
                                    <button onClick={() => openModal(client)} className="p-1.5 text-zinc-500 hover:text-blue-600 rounded" title="Editar">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(client.id)} className="p-1.5 text-zinc-500 hover:text-red-600 rounded" title="Eliminar">
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
            ) : (
                <div className="overflow-x-auto pb-4">
                    <PipelineBoard clients={filteredClients.length > 0 ? filteredClients : clients} />
                </div>
            )}

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
                                        className={`w-full p-2 rounded-lg border bg-background font-mono ${taxIdError ? 'border-red-500' : 'border-input'}`}
                                        placeholder="12.345.678-9"
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val.length > 2) {
                                                e.target.value = formatRut(val);
                                            }
                                        }}
                                        // On blur validation is nice, but we rely on submit for hard block
                                        onBlur={(e) => {
                                            if (e.target.value && !validateRut(e.target.value)) {
                                                setTaxIdError("RUT inválido");
                                            } else {
                                                setTaxIdError(null);
                                            }
                                        }}
                                    />
                                    {taxIdError && <p className="text-xs text-red-500 mt-1">{taxIdError}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Teléfono</label>
                                    <div className="flex gap-2">
                                        <select
                                            className="p-2 rounded-lg border border-input bg-background w-[90px] text-sm"
                                            value={phoneType}
                                            onChange={(e) => setPhoneType(e.target.value as 'mobile' | 'landline')}
                                        >
                                            <option value="mobile">Móvil</option>
                                            <option value="landline">Fijo</option>
                                        </select>
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none select-none">
                                                {phoneType === 'mobile' ? '+56 9' : '+56 2'}
                                            </span>
                                            <input
                                                name="phone_suffix"
                                                className="w-full p-2 pl-14 rounded-lg border border-input bg-background text-sm h-10"
                                                placeholder="12345678"
                                                value={rawPhone}
                                                onChange={(e) => {
                                                    // Only allow numbers
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setRawPhone(val.slice(0, 8)); // Max 8 digits
                                                }}
                                            />
                                            {/* Hidden input to send the full formatted value */}
                                            <input
                                                type="hidden"
                                                name="phone"
                                                value={rawPhone ? (phoneType === 'mobile' ? `+56 9 ${rawPhone}` : `+56 2 ${rawPhone}`) : ''}
                                            />
                                        </div>
                                    </div>
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
                                <button type="submit" disabled={isPending} className="px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 flex items-center disabled:opacity-50">
                                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
