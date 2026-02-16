'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLocation, updateLocation } from "@/app/actions/locations";
import { useToast } from "@/components/ui/Toast";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface LocationFormProps {
    isOpen: boolean;
    onClose: () => void;
    locationToEdit?: any;
}

export function LocationForm({ isOpen, onClose, locationToEdit }: LocationFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get('name') as string,
            address: formData.get('address') as string,
        };

        try {
            if (locationToEdit) {
                await updateLocation(locationToEdit.id, data);
                toast({ type: 'success', message: "Ubicación actualizada correctamente" });
            } else {
                await createLocation(data);
                toast({ type: 'success', message: "Ubicación creada correctamente" });
            }
            onClose();
            // Optional: Reload page or router.refresh() is handled in action but client state might need reset if not full nav
        } catch (error: any) {
            toast({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={locationToEdit ? "Editar Ubicación" : "Nueva Ubicación"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                        id="name"
                        name="name"
                        required
                        defaultValue={locationToEdit?.name}
                        placeholder="Ej: Bodega Central"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <div className="relative">
                        <select
                            name="type"
                            className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            defaultValue={locationToEdit?.type || 'WAREHOUSE'}
                        >
                            <option value="WAREHOUSE">Bodega</option>
                            <option value="VEHICLE">Vehículo / Camión</option>
                            <option value="SITE">Obra / Faena</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="address">Dirección / Referencia</Label>
                    <Input
                        id="address"
                        name="address"
                        defaultValue={locationToEdit?.address}
                        placeholder="Ej: Av. Principal 123"
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {locationToEdit ? "Guardar Cambios" : "Crear Ubicación"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
