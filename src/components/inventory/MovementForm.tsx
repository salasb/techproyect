'use client'

import { createInventoryMovementAction, transferStockAction } from "@/app/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Assuming Tabs is Shadcn properly?
import { Label } from "@/components/ui/label"; // Check if Label exists
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
    products: { id: string; name: string; sku: string }[];
    locations: { id: string; name: string }[];
}

export default function MovementForm({ products, locations }: Props) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [tab, setTab] = useState("simple"); // simple (IN/OUT/ADJUST) | transfer

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        try {
            if (tab === 'transfer') {
                await transferStockAction(formData);
            } else {
                await createInventoryMovementAction(formData);
            }
            toast.success("Movimiento registrado exitosamente");
            router.push('/inventory');
        } catch (error: any) {
            toast.error(error.message || "Error al registrar movimiento");
        } finally {
            setIsLoading(false);
        }
    }

    const typeOptions = [
        { value: "IN", label: "Entrada (Compra)" },
        { value: "OUT", label: "Salida (Consumo/Venta)" },
        { value: "ADJUST", label: "Ajuste (Inventario)" },
    ];

    const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));
    const productOptions = products.map(p => ({ value: p.id, label: `${p.sku} - ${p.name}` }));

    return (
        <div className="max-w-xl mx-auto p-6 bg-card rounded-lg border shadow-sm">
            <h2 className="text-xl font-bold mb-4">Registrar Movimiento</h2>

            <Tabs defaultValue="simple" onValueChange={setTab}>
                {/* Fix: TabsList might need className adjustment if it's default */}
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="simple">Entrada / Salida / Ajuste</TabsTrigger>
                    <TabsTrigger value="transfer">Transferencia</TabsTrigger>
                </TabsList>

                <form action={handleSubmit} className="space-y-4">
                    {tab === 'simple' ? (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type">Tipo</Label>
                                    <Select
                                        name="type"
                                        id="type"
                                        options={typeOptions}
                                        defaultValue="IN"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="locationId">Ubicación</Label>
                                    <Select
                                        name="locationId"
                                        id="locationId"
                                        options={locationOptions}
                                        placeholder="Seleccionar..."
                                        required
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fromLocationId">Origen</Label>
                                <Select
                                    name="fromLocationId"
                                    id="fromLocationId"
                                    options={locationOptions}
                                    placeholder="Desde..."
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="toLocationId">Destino</Label>
                                <Select
                                    name="toLocationId"
                                    id="toLocationId"
                                    options={locationOptions}
                                    placeholder="Hacia..."
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="productId">Producto</Label>
                        <Select
                            name="productId"
                            id="productId"
                            options={productOptions}
                            placeholder="Buscar producto..."
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="quantity">Cantidad</Label>
                        {/* Assuming Input is standard HTML input wrapper or Shadcn */}
                        <Input type="number" name="quantity" id="quantity" required min="0.01" step="0.01" placeholder="0.00" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción / Notas</Label>
                        <Textarea name="description" id="description" placeholder="Referencia, Orden de Compra, etc." />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Registrando..." : "Confirmar Movimiento"}
                    </Button>
                </form>
            </Tabs>
        </div>
    );
}
