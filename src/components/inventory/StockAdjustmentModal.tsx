'use client';

import { useState, useEffect } from 'react';
import { adjustStock, InventoryMovementType } from '@/app/actions/inventory';
import { getLocations } from '@/app/actions/locations';
import { createClient } from '@/lib/supabase/client';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from "@/components/ui/Toast";  // Added import

interface AdjustmentModalProps {
    productId: string;
    productName: string;
    currentStock: number; // Global stock
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function StockAdjustmentModal({ productId, productName, currentStock, isOpen, onClose, onSuccess }: AdjustmentModalProps) {
    const { toast } = useToast(); // Added hook
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingSub, setIsFetchingSub] = useState(false);
    const [locations, setLocations] = useState<any[]>([]);
    const [productStock, setProductStock] = useState<Record<string, number>>({});

    const [quantity, setQuantity] = useState<number>(0);
    const [type, setType] = useState<InventoryMovementType>('ADJUSTMENT');
    const [fromLocation, setFromLocation] = useState<string>("");
    const [toLocation, setToLocation] = useState<string>("");
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");

    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, productId]);

    async function loadData() {
        setIsFetchingSub(true);
        try {
            // Fetch Locations
            const locs = await getLocations();
            setLocations(locs || []);

            // Set default location if exists (e.g. Bodega Principal)
            const defaultLoc = locs?.find((l: any) => l.name === 'Bodega Principal') || locs?.[0];
            if (defaultLoc) {
                setFromLocation(defaultLoc.id);
            }

            // Fetch Product Stock by Location
            const { data } = await supabase
                .from('ProductStock')
                .select('locationId, quantity')
                .eq('productId', productId);

            const stockMap: Record<string, number> = {};
            data?.forEach((item: any) => {
                stockMap[item.locationId] = item.quantity;
            });
            setProductStock(stockMap);

        } catch (e) {
            console.error("Error loading contexts", e);
        } finally {
            setIsFetchingSub(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            if (type === 'TRANSFER') {
                if (!fromLocation || !toLocation) {
                    setError("Debe seleccionar origen y destino para transferencias.");
                    setIsLoading(false);
                    return;
                }
                if (fromLocation === toLocation) {
                    setError("Origen y destino no pueden ser iguales.");
                    setIsLoading(false);
                    return;
                }
                const currentLocStock = productStock[fromLocation] || 0;
                if (quantity > currentLocStock) {
                    setError(`Stock insuficiente en origen (${currentLocStock}).`);
                    setIsLoading(false);
                    return;
                }
            } else if (['OUT', 'SALE'].includes(type)) {
                if (!fromLocation) {
                    setError("Debe seleccionar una ubicación de origen.");
                    setIsLoading(false);
                    return;
                }
                const currentLocStock = productStock[fromLocation] || 0;
                if (quantity > currentLocStock) {
                    setError(`Stock insuficiente en ubicación seleccionada (${currentLocStock}).`);
                    setIsLoading(false);
                    return;
                }
            } else if (['IN', 'PURCHASE'].includes(type) || type === 'ADJUSTMENT') {
                if (!toLocation && type !== 'ADJUSTMENT') setToLocation(fromLocation);
            }

            let finalFrom = undefined;
            let finalTo = undefined;

            if (type === 'TRANSFER') {
                finalFrom = fromLocation;
                finalTo = toLocation;
            } else if (['OUT', 'SALE'].includes(type)) {
                finalFrom = fromLocation;
            } else if (['IN', 'PURCHASE'].includes(type)) {
                finalTo = fromLocation;
            } else if (type === 'ADJUSTMENT') {
                finalTo = fromLocation;
            }

            // Offline Handling
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                const { OfflineQueueService } = await import('@/services/offlineQueue');

                OfflineQueueService.addToQueue({
                    type: 'STOCK_ADJUSTMENT',
                    payload: {
                        productId,
                        quantity,
                        type,
                        fromLocation: finalFrom,
                        toLocation: finalTo,
                        reason
                    }
                });

                toast({ type: 'info', message: 'Guardado offline. Se sincronizará al conectar.' });

                onSuccess();
                onClose();
                setIsLoading(false);
                return;
            }

            const result = await adjustStock(productId, quantity, type, finalFrom, finalTo, reason);

            if (result.error) {
                setError(result.error);
            } else {
                toast({ type: 'success', message: 'Movimiento registrado correctamente.' });
                onSuccess();
                onClose();
            }
        } catch (err) {
            setError("Error inesperado al ajustar inventario.");
        } finally {
            setIsLoading(false);
        }
    }

    const isTransfer = type === 'TRANSFER';
    const isInbound = ['IN', 'PURCHASE', 'ADJUSTMENT'].includes(type);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
                    <div>
                        <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Movimiento de Stock</h3>
                        <p className="text-xs text-zinc-500">{productName} (Global: {currentStock})</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Visual Stock Indicator */}
                    {Object.keys(productStock).length > 0 && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs">
                            <span className="font-bold text-blue-700 block mb-1">Stock por Ubicación:</span>
                            <div className="flex flex-wrap gap-2">
                                {locations.filter(l => productStock[l.id]).map(l => (
                                    <span key={l.id} className="bg-white px-2 py-1 rounded border border-blue-200 text-blue-600">
                                        {l.name}: <b>{productStock[l.id]}</b>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Tipo de Movimiento</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as InventoryMovementType)}
                            className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 dark:border-zinc-700"
                        >
                            <option value="IN">Entrada (Compra/Reposición)</option>
                            <option value="OUT">Salida (Consumo/Venta)</option>
                            <option value="TRANSFER">Transferencia (Mover Stock)</option>
                            <option value="ADJUSTMENT">Ajuste (Inventario)</option>
                        </select>
                    </div>

                    <div className="grid gap-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">
                                {isTransfer ? 'Desde Origen' : isInbound ? 'Ubicación Destino' : 'Ubicación Origen'}
                            </label>
                            <select
                                value={fromLocation}
                                onChange={(e) => setFromLocation(e.target.value)}
                                className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 dark:border-zinc-700"
                            >
                                {locations.map(l => (
                                    <option key={l.id} value={l.id}>
                                        {l.name} ({l.type}) {productStock[l.id] ? ` - Stock: ${productStock[l.id]}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {isTransfer && (
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Hacia Destino</label>
                                <select
                                    value={toLocation}
                                    onChange={(e) => setToLocation(e.target.value)}
                                    className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 dark:border-zinc-700"
                                >
                                    <option value="">Seleccionar destino...</option>
                                    {locations.filter(l => l.id !== fromLocation).map(l => (
                                        <option key={l.id} value={l.id}>
                                            {l.name} ({l.type})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Cantidad</label>
                        <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                            required
                            className="w-full p-2 border rounded-lg text-sm font-mono dark:bg-zinc-800 dark:border-zinc-700"
                            placeholder="0"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Motivo / Notas</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full p-2 border rounded-lg text-sm dark:bg-zinc-800 dark:border-zinc-700"
                            placeholder="Ej: Transferencia a obra, Ajuste por inventario..."
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-zinc-900 border-t border-zinc-50">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-800 dark:text-zinc-400">Cancelar</button>
                        <button
                            type="submit"
                            disabled={isLoading || quantity <= 0 || isFetchingSub}
                            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                        >
                            {isLoading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                            Confirmar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
