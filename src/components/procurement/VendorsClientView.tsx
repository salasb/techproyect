"use client";

import { useState, useTransition } from "react";
import { upsertVendorAction } from "@/app/actions/procurement";
import { Plus, Search, MapPin, Phone, Mail, User, Trash2, Edit2, Loader2, X, FileText, Eye, List } from "lucide-react";
import { formatRut, validateRut } from "@/lib/rut";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

interface VendorData {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    taxId?: string | null;
    contactName?: string | null;
}

export function VendorsClientView({ initialVendors }: { initialVendors: VendorData[] }) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingVendor, setEditingVendor] = useState<VendorData | null>(null);
    const [search, setSearch] = useState("");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { toast } = useToast();

    const [taxIdError, setTaxIdError] = useState<string | null>(null);
    const [phoneType, setPhoneType] = useState<'mobile' | 'landline'>('mobile');
    const [rawPhone, setRawPhone] = useState('');

    const filteredVendors = initialVendors.filter(v =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.email?.toLowerCase().includes(search.toLowerCase())
    );

    async function handleSubmit(formData: FormData) {
        setTaxIdError(null);

        const name = formData.get('name') as string;
        const taxId = formData.get('taxId') as string;
        const email = formData.get('email') as string;
        const address = formData.get('address') as string;
        const contactName = formData.get('contactName') as string;
        const phone = formData.get('phone') as string;

        if (taxId && !validateRut(taxId)) {
            setTaxIdError("RUT inválido. Formato esperado: 12.345.678-9");
            return;
        }

        startTransition(async () => {
            try {
                const res = await upsertVendorAction({
                    id: editingVendor?.id,
                    name,
                    taxId,
                    email,
                    address,
                    contactName,
                    phone
                });

                if (res.error) throw new Error(res.error);

                toast({ type: 'success', message: editingVendor ? "Proveedor actualizado" : "Proveedor creado" });
                setIsAdding(false);
                setEditingVendor(null);
                router.refresh();
            } catch (error: any) {
                toast({ type: 'error', message: error.message || "Error al guardar proveedor" });
            }
        });
    }

    const openModal = (vendor?: VendorData) => {
        setEditingVendor(vendor || null);
        setIsAdding(true);
        setTaxIdError(null);

        if (vendor?.phone) {
            const cleanPhone = vendor.phone.replace(/\s/g, '');
            if (cleanPhone.startsWith('+569') || cleanPhone.startsWith('9')) {
                setPhoneType('mobile');
                setRawPhone(cleanPhone.replace('+569', '').replace('+56', ''));
            } else if (cleanPhone.startsWith('+562') || cleanPhone.startsWith('2')) {
                setPhoneType('landline');
                setRawPhone(cleanPhone.replace('+562', '').replace('+56', ''));
            } else {
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
                        placeholder="Buscar proveedor..."
                        className="pl-9 pr-4 py-2 w-full rounded-lg border border-input bg-background text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Proveedor
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map((vendor) => (
                    <div key={vendor.id} className="group bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-foreground text-lg">{vendor.name}</h3>
                                {vendor.taxId && (
                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                        <FileText className="w-3 h-3 mr-1" />
                                        {vendor.taxId}
                                    </div>
                                )}
                            </div>
                            <div className="flex bg-muted/50 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openModal(vendor)} className="p-1.5 text-zinc-500 hover:text-blue-600 rounded" title="Editar">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            {vendor.contactName && (
                                <div className="flex items-center text-zinc-600 dark:text-zinc-400">
                                    <User className="w-4 h-4 mr-2" />
                                    {vendor.contactName}
                                </div>
                            )}
                            {vendor.email && (
                                <div className="flex items-center text-zinc-600 dark:text-zinc-400">
                                    <Mail className="w-4 h-4 mr-2" />
                                    {vendor.email}
                                </div>
                            )}
                            {vendor.phone && (
                                <div className="flex items-center text-zinc-600 dark:text-zinc-400">
                                    <Phone className="w-4 h-4 mr-2" />
                                    {vendor.phone}
                                </div>
                            )}
                            {vendor.address && (
                                <div className="flex items-center text-zinc-600 dark:text-zinc-400">
                                    <MapPin className="w-4 h-4 mr-2" />
                                    <span className="truncate">{vendor.address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {filteredVendors.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                        <User className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-3" />
                        <h3 className="text-lg font-medium">No hay proveedores</h3>
                        <p className="text-muted-foreground">Empieza creando tu primer proveedor para gestionar compras.</p>
                    </div>
                )}
            </div>

            {/* Modal Form */}
            {(isAdding || editingVendor) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl border border-border flex flex-col">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h3 className="font-bold text-lg">{editingVendor ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                            <button onClick={() => { setIsAdding(false); setEditingVendor(null); }} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form action={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre / Razón Social <span className="text-red-500">*</span></label>
                                <input name="name" required defaultValue={editingVendor?.name} className="w-full p-2 rounded-lg border border-input bg-background" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">RUT / Tax ID</label>
                                    <input
                                        name="taxId"
                                        defaultValue={editingVendor?.taxId || ''}
                                        className={`w-full p-2 rounded-lg border bg-background font-mono ${taxIdError ? 'border-red-500' : 'border-input'}`}
                                        placeholder="12.345.678-9"
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val.length > 2) {
                                                e.target.value = formatRut(val);
                                            }
                                        }}
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
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setRawPhone(val.slice(0, 8));
                                                }}
                                            />
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
                                <input name="email" type="email" defaultValue={editingVendor?.email || ''} className="w-full p-2 rounded-lg border border-input bg-background" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Dirección</label>
                                <input name="address" defaultValue={editingVendor?.address || ''} className="w-full p-2 rounded-lg border border-input bg-background" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre Contacto Principal</label>
                                <input name="contactName" defaultValue={editingVendor?.contactName || ''} className="w-full p-2 rounded-lg border border-input bg-background" />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => { setIsAdding(false); setEditingVendor(null); }} className="px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">Cancelar</button>
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
