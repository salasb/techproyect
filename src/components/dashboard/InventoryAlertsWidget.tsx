
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, PackageOpen, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getOrganizationId } from "@/lib/current-org";

export default async function InventoryAlertsWidget() {
    const orgId = await getOrganizationId();
    const supabase = await createClient();

    // Fetch ALL products for this org due to filter limitations in simple queries for col comparison
    // In a real large app, we'd use an RPC or specific query.
    const { data: products } = await supabase
        .from('Product')
        .select('id, name, stock, min_stock, sku, type')
        .eq('organizationId', orgId)
        .eq('type', 'PRODUCT'); // Only physical products

    if (!products) return null;

    // Filter in memory: Stock <= MinStock
    const lowStockProducts = products.filter(p => p.stock <= p.min_stock);

    // Sort by "Criticality" (how far below min stock?)
    // Or just by stock ascending
    lowStockProducts.sort((a, b) => a.stock - b.stock);

    if (lowStockProducts.length === 0) {
        return null;
    }

    const displayCount = 3;
    const displayProducts = lowStockProducts.slice(0, displayCount);
    const hiddenCount = lowStockProducts.length - displayCount;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/30">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-100 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm">Alertas de Stock</h3>
                </div>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-200">
                    {lowStockProducts.length}
                </span>
            </div>

            <div className="p-2 flex-1">
                <div className="space-y-1">
                    {displayProducts.map(product => (
                        <div key={product.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors group">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate" title={product.name}>
                                    {product.name}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                    {product.sku}
                                </p>
                            </div>
                            <div className="text-right pl-2">
                                <div className="text-sm font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                    {product.stock}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">Min: {product.min_stock}</p>
                            </div>
                        </div>
                    ))}
                    {hiddenCount > 0 && (
                        <p className="text-center text-xs text-slate-400 py-1">
                            + {hiddenCount} más...
                        </p>
                    )}
                </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                <Link
                    href="/catalog"
                    className="flex items-center justify-center text-xs text-slate-600 hover:text-blue-600 font-medium transition-colors gap-1 group"
                >
                    Gestionar Inventario
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
            </div>
        </div>
    );
}
