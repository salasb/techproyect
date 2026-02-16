```typescript
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PlanForm } from "@/components/admin/PlanForm";

/*
- [x] Visualización clara de estados activos en el formulario de oportunidades.
- [x] Confirmación de que el asterisco rojo `* ` es auto-explicativo con la nueva leyenda.

## Fase 16: Soporte Multi-contacto
Se ha implementado la capacidad de gestionar múltiples contactos adicionales para cada cliente, tanto desde el módulo de Clientes como desde el CRM.

### Cambios Realizados:
- **Backend Robusto**: Las acciones de servidor (`createClientAction`, `updateClientAction`, `createQuickClient`) ahora procesan una lista dinámica de contactos secundarios y los sincronizan con la tabla `Contact`.
- **UI Dinámica en Clientes**: El formulario de edición/creación de clientes ahora incluye una sección para añadir N contactos (Nombre, Cargo, Email, Teléfono) de forma interactiva.
- **CRM Enriquecido**: Al crear una "Nueva Oportunidad" con un "Nuevo Prospecto", ahora puedes registrar múltiples contactos iniciales para esa empresa desde el mismo formulario.
- **Visualización de Detalles**: La página de detalles del cliente ya muestra todos los contactos secundarios vinculados, permitiendo una visión 360 del cliente.

### Verificación:
- [x] Creación de cliente con 2 contactos adicionales exitosa.
- [x] Creación de oportunidad con prospecto + 3 contactos exitosa.
- [x] Edición de contactos existentes (sincronización correcta).
*/
export default async function PlanEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let plan = null;
    let isNew = id === 'new';

    if (!isNew) {
        const supabase = await createClient();
        const { data } = await supabase.from('Plan').select('*').eq('id', id).single();
        if (data) {
            plan = {
                ...data,
                limits: data.limits as any,
                features: data.features as any
            };
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin/plans">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {isNew ? 'Crear Nuevo Plan' : `Editar Plan: ${ plan?.name } `}
                    </h1>
                </div>
            </div>

            <PlanForm id={id} isNew={isNew} plan={plan} />
        </div>
    );
}
