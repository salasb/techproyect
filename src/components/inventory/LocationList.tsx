'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Loader2 } from "lucide-react";
import { LocationForm } from "./LocationForm";
import { deleteLocation } from "@/app/actions/locations";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function LocationList({ location }: { location: any }) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteLocation(location.id);
            toast({ type: 'success', message: "Ubicación eliminada" });
        } catch (error: any) {
            toast({ type: 'error', message: error.message });
        } finally {
            setIsDeleting(false);
            setIsDeleteOpen(false);
        }
    };

    return (
        <>
            <div className="absolute top-4 right-4 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditOpen(true)}>
                    <Edit className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => setIsDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            <LocationForm
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                locationToEdit={location}
            />

            <ConfirmDialog
                isOpen={isDeleteOpen}
                onCancel={() => setIsDeleteOpen(false)}
                onConfirm={handleDelete}
                title="Eliminar Ubicación"
                description={`¿Estás seguro de eliminar "${location.name}"? Esta acción no se puede deshacer.`}
                variant="danger"
                isLoading={isDeleting}
            />
        </>
    );
}
