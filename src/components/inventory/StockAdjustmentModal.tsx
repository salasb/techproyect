'use client';

import { useState } from 'react';
import { adjustStock, InventoryMovementType } from '@/app/actions/inventory';
import { Loader2 } from 'lucide-react';

interface AdjustmentModalProps {
    productId: string;
    productName: string;
    currentStock: number;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function StockAdjustmentModal({ productId, productName, currentStock, isOpen, onClose, onSuccess }: AdjustmentModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [quantity, setQuantity] = useState<number>(0);
    const [type, setType] = useState<InventoryMovementType>('ADJUSTMENT');
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");

    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            // Logic: 
            // If type is OUT/SALE/PURCHASE(OUT?), adjust quantity sign?
            // adjust_inventory expects signed quantity if we want to add/subtract?
            // NO, `stock = stock + p_quantity`.
            // So if type is OUT, we must send negative quantity.

            let finalQty = quantity;
            if (['OUT', 'SALE'].includes(type)) {
                finalQty = -Math.abs(quantity);
            } else {
                finalQty = Math.abs(quantity);
            }

            const result = await adjustStock(productId, finalQty, type, reason);

            if (result.error) {
                setError(result.error);
            } else {
                onSuccess();
                onClose();
            }
        } catch (err) {
            setError("Error inesperado al ajustar inventario.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
                    <div>
                        <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Ajuste de Inventario</h3>
                        <p className="text-xs text-zinc-500">{productName} (Stock: {currentStock})</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Tipo de Movimiento</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as InventoryMovementType)}
                            className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 dark:border-zinc-700"
                        >
                            <option value="ADJUSTMENT">Ajuste (Entrada/Salida Manual)</option>
                            <option value="IN">Entrada (Compra/Reposición)</option>
                            <option value="OUT">Salida (Merma/Consumo)</option>
                            <option value="SALE">Venta (Salida)</option>
                            <option value="PURCHASE">Compra (Entrada)</option>
                        </select>
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
                        <p className="text-[10px] text-zinc-400 mt-1">
                            {['OUT', 'SALE'].includes(type) ? 'Se restará del stock (-)' : 'Se sumará al stock (+)'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Motivo / Referencia</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full p-2 border rounded-lg text-sm dark:bg-zinc-800 dark:border-zinc-700"
                            placeholder="Ej: Conteo cíclico, merma en bodega..."
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-800 dark:text-zinc-400">Cancelar</button>
                        <button
                            type="submit"
                            disabled={isLoading || quantity <= 0}
                            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                        >
                            {isLoading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                            Confirmar Ajuste
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
