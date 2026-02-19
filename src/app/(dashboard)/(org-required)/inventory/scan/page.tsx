'use client';

import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRightLeft, Package, Search } from "lucide-react";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";
import { useToast } from "@/components/ui/Toast";

export default function ScanPage() {
    const [scannedValue, setScannedValue] = useState<string | null>(null);
    const [product, setProduct] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
    const { toast } = useToast();
    const supabase = createClient();

    const handleScan = async (result: string) => {
        if (result && result !== scannedValue) {
            setScannedValue(result);
            fetchProduct(result);
        }
    };

    const fetchProduct = async (query: string) => {
        setIsLoading(true);
        setProduct(null);

        // Allow searching by ID or Barcode
        const { data, error } = await supabase
            .from('Product')
            .select('*')
            .or(`id.eq.${query},barcode.eq.${query}`)
            .single();

        if (error) {
            // Try by SKU as fallback?
            const { data: skuData, error: skuError } = await supabase
                .from('Product')
                .select('*')
                .eq('sku', query)
                .single();

            if (skuData) {
                setProduct(skuData);
            } else {
                toast({ type: 'error', message: "Producto no encontrado" });
            }
        } else {
            setProduct(data);
        }
        setIsLoading(false);
    };

    const resetScan = () => {
        setScannedValue(null);
        setProduct(null);
    };

    return (
        <div className="p-4 max-w-md mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-center mb-4">Escáner de Inventario</h1>

            {!product ? (
                <div className="space-y-4">
                    <div className="rounded-xl overflow-hidden border-2 border-slate-200 aspect-square relative">
                        <Scanner
                            onScan={(result) => result[0] && handleScan(result[0].rawValue)}
                        // components={{ audio: false }} // Optional config
                        />
                        <div className="absolute inset-0 border-2 border-blue-500 opacity-50 pointer-events-none m-12 rounded-lg"></div>
                        <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black/50 py-1">Apunta el código QR o Barra</p>
                    </div>

                    <div className="text-center text-slate-500 text-sm">
                        o ingresa el código manualmente
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 p-2 border rounded-lg"
                            placeholder="ID, SKU o Código"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleScan(e.currentTarget.value);
                            }}
                        />
                        <Button onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            handleScan(input.value);
                        }}>
                            <Search className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-blue-600 p-4 text-white">
                        <h2 className="font-bold text-lg">{product.name}</h2>
                        <div className="text-blue-100 text-sm font-mono">{product.sku}</div>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <span className="block text-xs uppercase text-slate-500 font-bold">Stock Global</span>
                                <span className="text-2xl font-bold text-slate-800">{product.stock}</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <span className="block text-xs uppercase text-slate-500 font-bold">Precio</span>
                                <span className="text-lg font-bold text-emerald-600">${product.priceNet?.toLocaleString()}</span>
                            </div>
                        </div>

                        <Button className="w-full h-12 text-lg" onClick={() => setIsAdjustmentOpen(true)}>
                            <ArrowRightLeft className="mr-2 h-5 w-5" />
                            Ajustar / Mover
                        </Button>

                        <Button variant="outline" className="w-full" onClick={resetScan}>
                            Escanear Otro
                        </Button>
                    </div>
                </div>
            )}

            {product && (
                <StockAdjustmentModal
                    productId={product.id}
                    productName={product.name}
                    currentStock={product.stock}
                    isOpen={isAdjustmentOpen}
                    onClose={() => setIsAdjustmentOpen(false)}
                    onSuccess={() => {
                        fetchProduct(product.id); // Refresh data
                        // Optional: resetScan();
                    }}
                />
            )}
        </div>
    );
}
