import { InventoryService } from "@/services/inventory-service";
import prisma from "@/lib/prisma";
import { Package } from "lucide-react";

export default async function ProjectInventory({ projectId, orgId }: { projectId: string, orgId: string }) {
    // Fetch movements related to this project (OUTs usually)
    const movements = await prisma.inventoryMovement.findMany({
        where: {
            organizationId: orgId,
            projectId: projectId
        },
        include: {
            product: true,
            location: true
        },
        orderBy: { createdAt: 'desc' }
    });

    if (movements.length === 0) {
        return (
            <div className="bg-card rounded-lg border p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Consumo de Inventario</h3>
                </div>
                <p className="text-sm text-muted-foreground">No hay consumo de inventario registrado para este proyecto.</p>
            </div>
        );
    }

    // Calculate total cost? 
    // We assume FIFO/Average cost is handled elsewhere, but we have product.costNet (current snapshot? no, product master).
    // Ideally movement should snapshot cost. It doesn't right now, only SKU.
    // We will use Product current cost as estimation or if valid.

    return (
        <div className="bg-card rounded-lg border shadow-sm">
            <div className="p-6 border-b flex items-center gap-2">
                <Package className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Consumo de Inventario</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                        <tr>
                            <th className="p-4">Fecha</th>
                            <th className="p-4">Producto</th>
                            <th className="p-4 text-right">Cantidad</th>
                            <th className="p-4">Ubicación</th>
                            <th className="p-4">Nota</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {movements.map((move: any) => (
                            <tr key={move.id} className="hover:bg-muted/50">
                                <td className="p-4 whitespace-nowrap">
                                    {new Date(move.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-4">
                                    <div className="font-medium">{move.product.name}</div>
                                    <div className="text-xs text-muted-foreground">{move.sku}</div>
                                </td>
                                <td className="p-4 text-right font-mono text-red-600 font-bold">
                                    -{move.quantity}
                                </td>
                                <td className="p-4">{move.location.name}</td>
                                <td className="p-4 text-muted-foreground truncate max-w-[200px]">
                                    {move.description}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
