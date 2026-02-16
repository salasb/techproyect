'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { LocationForm } from "./LocationForm";

export function AddLocationButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Ubicación
            </Button>
            <LocationForm isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
