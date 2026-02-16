import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Warehouse } from "lucide-react";
import { useRouter } from "next/navigation";
import { createLocation } from "@/app/actions/locations";
import { useToast } from "@/components/ui/Toast";

const formSchema = z.object({
    name: z.string().min(2, "El nombre es muy corto"),
    address: z.string().optional(),
});

interface LocationDialogProps {
    mode: 'create' | 'edit';
    location?: any; // ToDo: Type this
}

export function LocationDialog({ mode, location }: LocationDialogProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: location?.name || "",
            address: location?.address || "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            if (mode === 'create') {
                const result = await createLocation(values);
                if (result.error) {
                    toast({ type: 'error', message: result.error });
                    return;
                }
                toast({ type: 'success', message: "Ubicación creada correctamente" });
            }
            // TODO: Edit logic
            setOpen(false);
            form.reset();
            router.refresh();
        } catch (error) {
            toast({ type: 'error', message: "Error al guardar ubicación" });
        }
    }

    return (
        <>
            {mode === 'create' ? (
                <Button onClick={() => setOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Ubicación
                </Button>
            ) : (
                <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Editar</Button>
            )}

            <Modal
                isOpen={open}
                onClose={() => setOpen(false)}
                title={mode === 'create' ? 'Nueva Ubicación' : 'Editar Ubicación'}
                description="Registra un nuevo punto de almacenamiento o tienda."
                maxWidth="md"
            >
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Warehouse className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input className="pl-9" placeholder="Ej: Bodega Central" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dirección (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Av. Principal 123" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Guardar
                            </Button>
                        </div>
                    </form>
                </Form>
            </Modal>
        </>
    );
}
