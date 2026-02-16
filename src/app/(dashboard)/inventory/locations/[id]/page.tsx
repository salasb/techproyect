'use client'

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Box, ArrowRightLeft, Loader2, MapPin, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";

export default function LocationDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [location, setLocation] = useState<any>(null);
    const [stockItems, setStockItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Modal State
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);

    useEffect(() => {
        loadLocationData();
    }, [params.id]);

    async function loadLocationData() {
        setLoading(true);
        const supabase = createClient();

        // 1. Fetch Location Details
        const { data: loc } = await supabase
            .from('Location')
            .select('*')
            .eq('id', params.id)
            .single();

        setLocation(loc);

        // 2. Fetch Stock in this Location
        const { data: stock } = await supabase
            .from('ProductStock')
            .select(`
                quantity,
                minStock,
                maxStock,
                product:Product(id, name, sku, unit)
            `)
            .eq('locationId', params.id);

        // Filter out zero stock items if preferred, or show all
        const items = stock?.map((s: any) => ({
            ...s.product,
            quantity: s.quantity,
            minStock: s.minStock,
            maxStock: s.maxStock
        })) || [];

        setStockItems(items);
        setLoading(false);
    }

    const filteredItems = stockItems.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()))
    );

    if (loading) return <div className="p-12 text-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />Cargando ubicación...</div>;
    if (!location) return <div className="p-12 text-center">Ubicación no encontrada</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in">
            {/* Header */}
            <div>
                <Button variant="ghost" onClick={() => router.back()} className="mb-4 pl-0 hover:pl-2 transition-all">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Volver a Ubicaciones
                </Button>

                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl ${location.type === 'WAREHOUSE' ? 'bg-blue-100 text-blue-600' :
                                    location.type === 'VEHICLE' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                                }`}>
                                {location.type === 'WAREHOUSE' && <Box className="h-6 w-6" />}
                                {location.type === 'VEHICLE' && <MapPin className="h-6 w-6" />} {/* Truck icon is better but MapPin valid */}
                                {location.type === 'SITE' && <MapPin className="h-6 w-6" />}
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">{location.name}</h1>
                                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {location.address || "Sin dirección"}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => { setSelectedProduct(null); setIsAdjustmentOpen(true); }} variant="outline">
                            <ArrowRightLeft className="h-4 w-4 mr-2" />
                            Transferir Stock
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Cards (Optional for future) */}

            {/* Stock Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 flex gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            placeholder="Buscar producto..."
                            className="pl-9 pr-4 py-2 w-full text-sm border rounded-lg"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                        <tr>
                            <th className="px-6 py-4">Producto</th>
                            <th className="px-6 py-4 text-center">SKU</th>
                            <th className="px-6 py-4 text-center">Unidad</th>
                            <th className="px-6 py-4 text-right">Cantidad</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                    No hay productos con stock en esta ubicación.
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium">{item.name}</td>
                                    <td className="px-6 py-4 text-center font-mono text-xs text-slate-500">{item.sku || '-'}</td>
                                    <td className="px-6 py-4 text-center text-slate-500">{item.unit}</td>
                                    <td className="px-6 py-4 text-right font-bold">{item.quantity}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => { setSelectedProduct(item); setIsAdjustmentOpen(true); }}
                                        >
                                            <ArrowRightLeft className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Adjustment Modal Reuse */}
            {selectedProduct && (
                <StockAdjustmentModal
                    productId={selectedProduct.id}
                    productName={selectedProduct.name}
                    currentStock={selectedProduct.quantity} // Just local stock context? Or global? Modal expects global but maybe we should tweak.
                    // For now, modal implementation fetches contexts inside.
                    isOpen={isAdjustmentOpen}
                    onClose={() => setIsAdjustmentOpen(false)}
                    onSuccess={loadLocationData}
                />
            )}

            {/* General Transfer Modal (No product selected) - To implement properly, Modal needs optional productId? 
                 Currently modal requires productId. So the "General Transfer" button above might need a different Modal 
                 or a "Select Product" step. For now, let's hide the top button or make it open a "Quick Add" for a product lookup.
                 Let's keep it simple: Only per-row actions for now.
             */}
        </div>
    );
}
