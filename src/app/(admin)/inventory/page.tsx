import { resolveActiveOrganization } from "@/lib/auth/server-resolver";
import { InventoryService } from "@/services/inventory-service";
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Assuming exist
import { Plus, Package, AlertTriangle } from "lucide-react";

export default async function InventoryDashboard() {
    const orgId = await resolveActiveOrganization();
    if (!orgId) return <div>Organización no encontrada</div>;

    const products = await InventoryService.getProductsWithStock(orgId);

    // Identify low stock (simplified logic for v1: arbitrary or 0)
    const lowStock = products.filter(p => p.totalStock <= 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
                    <p className="text-muted-foreground">Gestión de productos y existencias.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/inventory/movements/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo Movimiento
                        </Button>
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Total Productos</h3>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{products.length}</div>
                </div>
                <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Stock Crítico</h3>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold text-amber-600">{lowStock.length}</div>
                    <p className="text-xs text-muted-foreground">Productos sin stock</p>
                </div>
            </div>

            {/* Product List Table */}
            <div className="border rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                        <tr>
                            <th className="p-4">Producto / SKU</th>
                            <th className="p-4 text-right">Costo Neto</th>
                            <th className="p-4 text-right">Existencias</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {products.map((product) => (
                            <tr key={product.id} className="hover:bg-muted/50 transition-colors">
                                <td className="p-4">
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-xs text-muted-foreground">{product.sku}</div>
                                </td>
                                <td className="p-4 text-right">
                                    ${product.costNet.toLocaleString('es-CL')}
                                </td>
                                <td className="p-4 text-right">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.totalStock > 0
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                        }`}>
                                        {product.totalStock} {product.unit}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <Link href={`/inventory/products/${product.id}`}>
                                        <Button variant="ghost" size="sm">Ver Kardex</Button>
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {products.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                    No hay productos registrados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
