'use client'

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Package, ArrowRightLeft, History, AlertTriangle, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/actions/products";
import { Database } from "@/types/supabase";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";
import { KardexModal } from "@/components/inventory/KardexModal";
import { ProductLabelModal } from "@/components/inventory/ProductLabelModal";
import { Printer } from "lucide-react";

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
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
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
        try {
            let result;
            if (editingProduct) {
                result = await updateProduct(editingProduct.id, formData);
            } else {
                result = await createProduct(formData);
            }

            if (result && !result.success) {
                alert(result.error || "Error al guardar producto");
                return;
            }

            setIsModalOpen(false);
            setEditingProduct(null);
            loadProducts();
        } catch (error: any) {
            console.error("Save Error:", error);
            alert("Error de conexión o del servidor al guardar producto");
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("¿Eliminar este producto?")) return;
        await deleteProduct(id);
        loadProducts();
    }

    const handleExport = () => {
        if (products.length === 0) return;

        // Use the centralized PDF download utility
        const columns = [
            { header: "SKU", accessor: (p: Product) => p.sku || "" },
            { header: "Nombre", accessor: (p: Product) => p.name },
            { header: "Tipo", accessor: (p: Product) => p.type === 'PRODUCT' ? 'Producto' : 'Servicio' },
            { header: "Unidad", accessor: (p: Product) => p.unit },
            { header: "Costo (Neto)", accessor: (p: Product) => `$${p.costNet.toLocaleString('es-CL')}` },
            { header: "Precio (Neto)", accessor: (p: Product) => `$${p.priceNet.toLocaleString('es-CL')}` },
            { header: "Precio (Bruto)", accessor: (p: Product) => `$${Math.round(p.priceNet * 1.19).toLocaleString('es-CL')}` },
            { header: "Stock", accessor: (p: Product) => p.type === 'PRODUCT' ? p.stock.toString() : '-' },
            { header: "Stock Min", accessor: (p: Product) => p.type === 'PRODUCT' ? p.min_stock.toString() : '-' },
        ];

        import("@/lib/exportUtils").then(({ downloadPdf }) => {
            downloadPdf(
                products,
                columns,
                `inventario_${new Date().toISOString().split('T')[0]}.pdf`,
                'REPORTE DE INVENTARIO'
            );
        }).catch(err => {
            console.error("Error loading export utils:", err);
            alert("Error al generar PDF");
        });
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Inventario</h1>
                    <p className="text-slate-500 mt-2">Gestiona tus servicios y productos recurrentes</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg transition-colors shadow-sm font-medium"
                    >
                        <History className="w-5 h-5 mr-2" />
                        Exportar
                    </button>
                    <button
                        onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm font-medium"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Nuevo Producto
                    </button>
                </div>
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

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                        <tr>
                            <th className="px-6 py-4">SKU / Tipo</th>
                            <th className="px-6 py-4">Nombre / Descripción</th>
                            <th className="px-6 py-4 text-center">Unidad</th>
                            <th className="px-6 py-4 text-right">
                                <Tooltip>
                                    <TooltipTrigger className="cursor-help decoration-dotted underline underline-offset-2">Precio Neto</TooltipTrigger>
                                    <TooltipContent>Sin IVA (Base imponible)</TooltipContent>
                                </Tooltip>
                            </th>
                            <th className="px-6 py-4 text-right">
                                <Tooltip>
                                    <TooltipTrigger className="cursor-help decoration-dotted underline underline-offset-2">Precio Bruto</TooltipTrigger>
                                    <TooltipContent>Con IVA (19%) incluido</TooltipContent>
                                </Tooltip>
                            </th>
                            <th className="px-6 py-4 text-center">Stock</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Cargando inventario...</td></tr>
                        ) : displayedProducts.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-500">
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
                                        {p.description && <div className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">{p.description}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-500">{p.unit}</td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-600">
                                        ${p.priceNet.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900 bg-slate-50/30">
                                        ${Math.round(p.priceNet * 1.19).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {p.type === 'PRODUCT' ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <div className={`font-mono font-bold ${p.stock <= p.min_stock ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded' : 'text-slate-700'}`}>
                                                    {p.stock}
                                                </div>
                                                {p.stock <= p.min_stock && (
                                                    <Tooltip>
                                                        <TooltipTrigger><AlertTriangle className="w-3 h-3 text-red-500" /></TooltipTrigger>
                                                        <TooltipContent>Stock bajo mínimo ({p.min_stock})</TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {p.type === 'PRODUCT' && (
                                                <>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => { setSelectedProduct(p); setIsAdjustmentOpen(true); }}
                                                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            >
                                                                <ArrowRightLeft className="w-4 h-4" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Ajustar Stock</TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => { setSelectedProduct(p); setIsKardexOpen(true); }}
                                                                className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                            >
                                                                <History className="w-4 h-4" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Ver Kardex</TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => { setSelectedProduct(p); setIsLabelModalOpen(true); }}
                                                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                                            >
                                                                <Printer className="w-4 h-4" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Imprimir Etiqueta</TooltipContent>
                                                    </Tooltip>

                                                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                                </>
                                            )}

                                            <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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

            {/* Mobile Card List */}
            <div className="md:hidden space-y-4">
                {isLoading ? (
                    <div className="text-center py-8 text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Cargando...</div>
                ) : displayedProducts.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-white rounded-xl border border-slate-200">
                        {showLowStock ? 'No hay productos con stock bajo.' : 'No hay productos encontrados.'}
                    </div>
                ) : (
                    displayedProducts.map((p) => (
                        <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-slate-900">{p.name}</div>
                                    <div className="text-xs text-slate-500 mt-1 flex gap-2 items-center">
                                        <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">{p.sku || 'S/ SKU'}</span>
                                        <span className={`px-1.5 py-0.5 rounded font-bold ${p.type === 'PRODUCT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {p.type === 'PRODUCT' ? 'PROD' : 'SERV'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-slate-900">${Math.round(p.priceNet * 1.19).toLocaleString()}</div>
                                    <div className="text-xs text-slate-400">Bruto</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm border-t border-slate-100 pt-3">
                                <div>
                                    <span className="text-slate-400 text-xs block">Precio Neto</span>
                                    <span className="font-medium">${p.priceNet.toLocaleString()}</span>
                                </div>
                                {p.type === 'PRODUCT' && (
                                    <div>
                                        <span className="text-slate-400 text-xs block">Stock</span>
                                        <div className={`font-medium flex items-center gap-1 ${p.stock <= p.min_stock ? 'text-red-600' : 'text-slate-700'}`}>
                                            {p.stock} {p.unit}
                                            {p.stock <= p.min_stock && <AlertTriangle className="w-3 h-3" />}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                {p.type === 'PRODUCT' && (
                                    <>
                                        <button onClick={() => { setSelectedProduct(p); setIsAdjustmentOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><ArrowRightLeft className="w-4 h-4" /></button>
                                        <button onClick={() => { setSelectedProduct(p); setIsKardexOpen(true); }} className="p-2 bg-purple-50 text-purple-600 rounded-lg"><History className="w-4 h-4" /></button>
                                        <button onClick={() => { setSelectedProduct(p); setIsLabelModalOpen(true); }} className="p-2 bg-slate-100 text-slate-600 rounded-lg"><Printer className="w-4 h-4" /></button>
                                    </>
                                )}
                                <div className="flex-1"></div>
                                <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))
                )}
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
                    <ProductLabelModal
                        isOpen={isLabelModalOpen}
                        onClose={() => setIsLabelModalOpen(false)}
                        product={selectedProduct}
                    />
                </>
            )}
        </div>
    );
}

function CalculationFields({ editingProduct }: { editingProduct: Product | null }) {
    const VAT_RATE = 0.19;
    const [cost, setCost] = useState(editingProduct?.costNet || 0);
    const [margin, setMargin] = useState(0); // Margin %
    const [priceNet, setPriceNet] = useState(editingProduct?.priceNet || 0);
    const [priceGross, setPriceGross] = useState(editingProduct ? Math.round(editingProduct.priceNet * (1 + VAT_RATE)) : 0);
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
                const newPriceNet = cost / (1 - (margin / 100));
                setPriceNet(parseFloat(newPriceNet.toFixed(2)));
                setPriceGross(Math.round(newPriceNet * (1 + VAT_RATE)));
            }
        }
    }, [cost, margin, useMargin]);

    const handlePriceNetChange = (val: number) => {
        setPriceNet(val);
        setPriceGross(Math.round(val * (1 + VAT_RATE)));
        setUseMargin(false);
    };

    const handlePriceGrossChange = (val: number) => {
        setPriceGross(val);
        const newNet = val / (1 + VAT_RATE);
        setPriceNet(parseFloat(newNet.toFixed(2)));
        setUseMargin(false);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unidad</label>
                    <select name="unit" defaultValue={editingProduct?.unit || 'UN'} className="w-full p-2 border rounded-lg text-sm bg-white">
                        <option value="UN">UN</option>
                        <option value="GL">GL</option>
                        <option value="HR">HR</option>
                        <option value="MT">MT</option>
                        <option value="KG">KG</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Costo (Neto)</label>
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
                    <label className="block text-[10px] font-bold text-blue-500 uppercase mb-1">Margen %</label>
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
                    <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Precio Neto</label>
                    <input
                        name="priceNet"
                        type="number"
                        step="0.01"
                        value={priceNet}
                        onChange={(e) => handlePriceNetChange(parseFloat(e.target.value) || 0)}
                        required
                        className="w-full p-2 border border-emerald-200 rounded-lg text-sm font-mono font-bold text-emerald-700 bg-white"
                        placeholder="0"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-emerald-700 mb-1">Precio Final (Bruto con IVA 19%)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-emerald-600 font-bold">$</span>
                        <input
                            type="number"
                            value={priceGross}
                            onChange={(e) => handlePriceGrossChange(parseInt(e.target.value) || 0)}
                            className="w-full pl-7 pr-4 py-2 border border-emerald-200 rounded-xl text-lg font-bold text-emerald-900 bg-white shadow-inner"
                            placeholder="Precio final de venta"
                        />
                    </div>
                    <p className="text-[10px] text-emerald-600 mt-1 italic">
                        Calculado: Neto (${priceNet.toLocaleString()}) + IVA (${Math.round(priceNet * 0.19).toLocaleString()})
                    </p>
                </div>
            </div>
        </div>
    );
}

