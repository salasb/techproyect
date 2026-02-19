import { resolveActiveOrganization } from "@/lib/auth/server-resolver";
import MovementForm from "@/components/inventory/MovementForm";
import prisma from "@/lib/prisma";

export default async function NewMovementPage() {
    const orgId = await resolveActiveOrganization();

    // Fetch Data for Form (Products, Locations)
    const products = await prisma.product.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, sku: true },
        orderBy: { name: 'asc' }
    });

    const locations = await prisma.location.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    });

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Nuevo Movimiento de Inventario</h1>
            <MovementForm products={products} locations={locations} />
        </div>
    );
}
