import { resolveActiveOrganization } from "@/lib/auth/server-resolver";
import { InventoryService } from "@/services/inventory-service";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, History } from "lucide-react";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
    const orgId = await resolveActiveOrganization();
    if (!orgId) return <div>Organización no encontrada</div>;

    const productId = params.id;
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { stockEntries: { include: { location: true } } } // Snapshot stock
    });

    if (!product || product.organizationId !== orgId) {
        return <div>Producto no encontrado</div>;
    }

    const movements = await InventoryService.getKardex(orgId, productId);
    const totalStock = product.stockEntries.reduce((acc, e) => acc + e.quantity, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/inventory">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">{product.name}</h1>
                    <p className="text-muted-foreground">{product.sku}</p>
                </div>
                <div className="ml-auto">
                    <div className="text-right">
                        <span className="text-2xl font-bold text-emerald-600">{totalStock} {product.unit}</span>
                        <p className="text-xs text-muted-foreground">En existencia</p>
                    </div>
                </div>
            </div>

            {/* Stock per Location */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {product.stockEntries.map(stock => (
                    <div key={stock.id} className="p-4 border rounded-lg bg-card shadow-sm flex justify-between items-center">
                        <div>
                            <h4 className="font-semibold">{stock.location.name}</h4>
                            <p className="text-xs text-muted-foreground">Ubicación</p>
                        </div>
                        <span className="font-bold text-lg">{stock.quantity}</span>
                    </div>
                ))}
            </div>

            {/* Kardex / Movements */}
            <div className="border rounded-lg bg-card">
                <div className="p-4 border-b flex items-center gap-2">
                    <History className="w-4 h-4" />
                    <h3 className="font-semibold">Historial de Movimientos (Kardex)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                            <tr>
                                <th className="p-4">Fecha</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Cantidad</th>
                                <th className="p-4">Ubicación</th>
                                <th className="p-4">Detalle / Proyecto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {movements.map((move) => {
                                const isPos = ['IN', 'ADJUST'].includes(move.type) ? move.quantity > 0 : false;
                                // Wait, logic:
                                // IN: +
                                // OUT: -
                                // ADJUST: signed (can be + or -)
                                // TRANSFER: context dependent.
                                // We store absolute quantity in DB.
                                // But wait, in service I implemented simple logic.
                                // Visualizing it:
                                // If Type IN -> Green +
                                // If Type OUT -> Red -

                                const isIn = move.type === 'IN';
                                const isOut = move.type === 'OUT';
                                const isTransfer = move.type === 'TRANSFER';
                                const isAdjust = move.type === 'ADJUST';

                                // Color logic
                                let colorClass = "text-gray-600";
                                let sign = "";

                                if (isIn) { colorClass = "text-emerald-600"; sign = "+"; }
                                if (isOut) { colorClass = "text-red-600"; sign = "-"; }
                                if (isAdjust) { colorClass = "text-amber-600"; sign = "±"; } // Ambiguous without signed qty storage decision
                                if (isTransfer) { colorClass = "text-blue-600"; sign = "↔"; }

                                return (
                                    <tr key={move.id} className="hover:bg-muted/50">
                                        <td className="p-4 whitespace-nowrap">
                                            {new Date(move.createdAt).toLocaleDateString()}
                                            <span className="block text-xs text-muted-foreground">
                                                {new Date(move.createdAt).toLocaleTimeString()}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase border ${isIn ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                                isOut ? 'bg-red-50 border-red-200 text-red-700' :
                                                    'bg-zinc-50 border-zinc-200 text-zinc-700'
                                                }`}>
                                                {move.type}
                                            </span>
                                        </td>
                                        <td className={`p-4 font-mono font-bold ${colorClass}`}>
                                            {sign}{move.quantity}
                                        </td>
                                        <td className="p-4">
                                            {move.location.name}
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            {move.description}
                                            {move.project && (
                                                <div className="flex items-center gap-1 text-xs text-primary mt-1">
                                                    <span className="font-semibold">Proyecto:</span> {move.project.name}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
