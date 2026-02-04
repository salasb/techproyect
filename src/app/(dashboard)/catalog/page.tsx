'use client'

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Package } from "lucide-react";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/actions/products";
import { Database } from "@/types/supabase";

type Product = Database['public']['Tables']['Product']['Row'];

export default function CatalogPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    useEffect(() => {
        loadProducts();
    }, [search]);

    async function loadProducts() {
        setIsLoading(true);
        try {
            const data = await getProducts(search);
            setProducts(data || []);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSubmit(formData: FormData) {
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
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Catálogo de Productos</h1>
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

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Buscar por nombre o SKU..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 shadow-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                        <tr>
                            <th className="px-6 py-4">SKU</th>
                            <th className="px-6 py-4">Nombre / Descripción</th>
                            <th className="px-6 py-4 text-center">Unidad</th>
                            <th className="px-6 py-4 text-right">Precio Lista</th>
                            <th className="px-6 py-4 text-right">Costo Est.</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">Cargando...</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">No hay productos encontrados.</td></tr>
                        ) : (
                            products.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{p.sku}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{p.name}</div>
                                        {p.description && <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-500">{p.unit}</td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-700">
                                        ${p.priceNet.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-500">
                                        ${p.costNet.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800 mr-3" title="Editar">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700" title="Eliminar">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
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
                                    <label className="block text-xs font-medium text-slate-500 mb-1">SKU</label>
                                    <input name="sku" defaultValue={editingProduct?.sku} required className="w-full p-2 border rounded-lg text-sm" placeholder="EJ: SERV-01" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Unidad</label>
                                    <select name="unit" defaultValue={editingProduct?.unit || 'UN'} className="w-full p-2 border rounded-lg text-sm">
                                        <option value="UN">UN</option>
                                        <option value="GL">GL</option>
                                        <option value="HR">HR</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                                <input name="name" defaultValue={editingProduct?.name} required className="w-full p-2 border rounded-lg text-sm" placeholder="Nombre del servicio o producto" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Descripción (Opcional)</label>
                                <textarea name="description" defaultValue={editingProduct?.description || ''} className="w-full p-2 border rounded-lg text-sm h-20 resize-none" placeholder="Detalles adicionales..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Precio Lista (Neto)</label>
                                    <input name="priceNet" type="number" defaultValue={editingProduct?.priceNet} required className="w-full p-2 border rounded-lg text-sm font-mono" placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Costo Est. (Neto)</label>
                                    <input name="costNet" type="number" defaultValue={editingProduct?.costNet} required className="w-full p-2 border rounded-lg text-sm font-mono" placeholder="0" />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancelar</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
