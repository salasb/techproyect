'use client'

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Package, ArrowRightLeft, History, AlertTriangle } from "lucide-react";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/actions/products";
import { Database } from "@/types/supabase";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";
import { KardexModal } from "@/components/inventory/KardexModal";

type Product = Database['public']['Tables']['Product']['Row'];

export default function CatalogPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showLowStock, setShowLowStock] = useState(false); // [NEW]

    // Restoration of missing state
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
    const [isKardexOpen, setIsKardexOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    useEffect(() => {
        loadProducts();
    }, [search]); // Reload when search changes. Low stock toggle filters client-side for now.

    async function loadProducts() {
        setIsLoading(true);
        try {
            const data = await getProducts(search);
            setProducts(data || []);
        } finally {
            setIsLoading(false);
        }
    }

    // [NEW] Filter logic
    const displayedProducts = showLowStock
        ? products.filter(p => p.type === 'PRODUCT' && p.stock <= p.min_stock)
        : products;

    async function handleSubmit(formData: FormData) {
        // ... existing logic ...
        try {
            if (editingProduct) {
                await updateProduct(editingProduct.id, formData);
            } else {
                await createProduct(formData);
            }
            setIsModalOpen(false);
            setEditingProduct(null);
            loadProducts();
        } catch (error) {
            alert("Error al guardar producto");
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("¿Eliminar este producto?")) return;
        await deleteProduct(id);
        loadProducts();
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Inventario</h1>
                    <p className="text-slate-500 mt-2">Gestiona tus servicios y productos recurrentes</p>
                </div>
                <button
                    onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm font-medium"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Nuevo Producto
                </button>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o SKU..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setShowLowStock(!showLowStock)}
                    className={`flex items-center px-4 py-2 rounded-xl border font-medium transition-all ${showLowStock
                        ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <AlertTriangle className={`w-4 h-4 mr-2 ${showLowStock ? 'text-amber-600' : 'text-slate-400'}`} />
                    {showLowStock ? 'Mostrando Stock Bajo' : 'Filtrar Stock Bajo'}
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                        <tr>
                            <th className="px-6 py-4">SKU / Tipo</th>
                            <th className="px-6 py-4">Nombre / Descripción</th>
                            <th className="px-6 py-4 text-center">Unidad</th>
                            <th className="px-6 py-4 text-right">Precio Lista</th>
                            <th className="px-6 py-4 text-center">Stock</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">Cargando...</td></tr>
                        ) : displayedProducts.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">
                                {showLowStock ? 'No hay productos con stock bajo.' : 'No hay productos encontrados.'}
                            </td></tr>
                        ) : (
                            displayedProducts.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-mono text-xs text-slate-500">{p.sku || '-'}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 ${p.type === 'PRODUCT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {p.type === 'PRODUCT' ? 'PROD' : 'SERV'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{p.name}</div>
                                        {p.description && <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-500">{p.unit}</td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-700">
                                        ${p.priceNet.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {p.type === 'PRODUCT' ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <div className={`font-mono font-bold ${p.stock <= p.min_stock ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded' : 'text-slate-700'}`}>
                                                    {p.stock}
                                                </div>
                                                {p.stock <= p.min_stock && <AlertTriangle className="w-3 h-3 text-red-500" />}
                                            </div>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {p.type === 'PRODUCT' && (
                                                <>
                                                    <button
                                                        onClick={() => { setSelectedProduct(p); setIsAdjustmentOpen(true); }}
                                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Ajustar Stock"
                                                    >
                                                        <ArrowRightLeft className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedProduct(p); setIsKardexOpen(true); }}
                                                        className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                        title="Ver Kardex"
                                                    >
                                                        <History className="w-4 h-4" />
                                                    </button>
                                                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                                </>
                                            )}

                                            <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-semibold text-lg">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        <form action={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">SKU (Opcional)</label>
                                    <input name="sku" defaultValue={editingProduct?.sku || ''} className="w-full p-2 border rounded-lg text-sm uppercase" placeholder="EJ: SERV-01" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                                    <select name="type" defaultValue={editingProduct?.type || 'SERVICE'} className="w-full p-2 border rounded-lg text-sm bg-slate-50">
                                        <option value="SERVICE">Servicio (Intangible)</option>
                                        <option value="PRODUCT">Producto (Físico, Control Stock)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                                <input name="name" defaultValue={editingProduct?.name} required className="w-full p-2 border rounded-lg text-sm" placeholder="Nombre del servicio o producto" />
                            </div>

                            <CalculationFields editingProduct={editingProduct} />

                            {!editingProduct ? (
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <h4 className="text-xs font-semibold text-blue-800 mb-2">Inventario Inicial (Solo Productos)</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-blue-600 mb-1">Stock Inicial</label>
                                            <input name="initialStock" type="number" min="0" defaultValue={0} className="w-full p-2 border border-blue-200 rounded-lg text-sm font-mono" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-blue-600 mb-1">Stock Mínimo (Alerta)</label>
                                            <input name="minStock" type="number" min="0" defaultValue={0} className="w-full p-2 border border-blue-200 rounded-lg text-sm font-mono" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Stock Mínimo</label>
                                        <input name="minStock" type="number" min="0" defaultValue={editingProduct?.min_stock} className="w-full p-2 border rounded-lg text-sm font-mono" />
                                    </div>
                                    <div className="flex items-end justify-center pb-2">
                                        <span className="text-xs text-slate-400">El stock real se ajusta con el botón <ArrowRightLeft className="w-3 h-3 inline" /> en la lista.</span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
                                <textarea name="description" defaultValue={editingProduct?.description || ''} className="w-full p-2 border rounded-lg text-sm h-16 resize-none" placeholder="Detalles adicionales..." />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancelar</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Inventory Modals */}
            {selectedProduct && (
                <>
                    <StockAdjustmentModal
                        productId={selectedProduct.id}
                        productName={selectedProduct.name}
                        currentStock={selectedProduct.stock}
                        isOpen={isAdjustmentOpen}
                        onClose={() => setIsAdjustmentOpen(false)}
                        onSuccess={() => loadProducts()}
                    />
                    <KardexModal
                        productId={selectedProduct.id}
                        productName={selectedProduct.name}
                        isOpen={isKardexOpen}
                        onClose={() => setIsKardexOpen(false)}
                    />
                </>
            )}
        </div>
    );
}

function CalculationFields({ editingProduct }: { editingProduct: Product | null }) {
    const [cost, setCost] = useState(editingProduct?.costNet || 0);
    const [margin, setMargin] = useState(0); // Margin %
    const [price, setPrice] = useState(editingProduct?.priceNet || 0);
    const [useMargin, setUseMargin] = useState(false);

    // Initial calculation of margin if cost & price exist: Margin = (Price - Cost) / Price
    useEffect(() => {
        if (editingProduct && editingProduct.costNet > 0 && editingProduct.priceNet > 0) {
            const calculatedMargin = ((editingProduct.priceNet - editingProduct.costNet) / editingProduct.priceNet) * 100;
            setMargin(parseFloat(calculatedMargin.toFixed(1)));
        }
    }, [editingProduct]);

    // Recalculate Price when Cost or Margin changes
    useEffect(() => {
        if (useMargin) {
            if (cost > 0 && margin < 100) {
                // Gross Margin Formula: Price = Cost / (1 - Margin%)
                const newPrice = cost / (1 - (margin / 100));
                setPrice(parseFloat(newPrice.toFixed(2)));
            }
        }
    }, [cost, margin, useMargin]);

    return (
        <div className="grid grid-cols-4 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Unidad</label>
                <select name="unit" defaultValue={editingProduct?.unit || 'UN'} className="w-full p-2 border rounded-lg text-sm">
                    <option value="UN">UN</option>
                    <option value="GL">GL</option>
                    <option value="HR">HR</option>
                    <option value="MT">MT</option>
                    <option value="KG">KG</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Costo (Neto)</label>
                <input
                    name="costNet"
                    type="number"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full p-2 border rounded-lg text-sm font-mono"
                    placeholder="0"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-blue-600 mb-1">Margen %</label>
                <div className="relative">
                    <input
                        type="number"
                        step="0.1"
                        value={margin}
                        onChange={(e) => {
                            setMargin(parseFloat(e.target.value) || 0);
                            setUseMargin(true);
                        }}
                        className="w-full p-2 border border-blue-200 rounded-lg text-sm font-mono text-blue-700"
                        placeholder="30"
                    />
                    <div className="absolute right-2 top-2 text-xs text-blue-400 font-bold">%</div>
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-emerald-600 mb-1">Precio (Auto)</label>
                <input
                    name="priceNet"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => {
                        setPrice(parseFloat(e.target.value) || 0);
                        setUseMargin(false); // Manual override disables auto-calc
                    }}
                    required
                    className="w-full p-2 border border-emerald-200 rounded-lg text-sm font-mono font-bold text-emerald-700"
                    placeholder="0"
                />
            </div>
        </div>
    );
}

