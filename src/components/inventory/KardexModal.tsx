'use client';

import { useState, useEffect } from 'react';
import { getKardex } from '@/app/actions/inventory';
import { Loader2, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, ShoppingCart, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface KardexModalProps {
    productId: string;
    productName: string;
    isOpen: boolean;
    onClose: () => void;
}

interface Movement {
    id: string;
    type: string;
    quantity: number;
    reason: string | null;
    createdAt: string;
    createdBy: string | null;
}

export function KardexModal({ productId, productName, isOpen, onClose }: KardexModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [movements, setMovements] = useState<Movement[]>([]);

    useEffect(() => {
        if (isOpen && productId) {
            loadKardex();
        }
    }, [isOpen, productId]);

    async function loadKardex() {
        setIsLoading(true);
        try {
            const { data, error } = await getKardex(productId);
            if (data) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setMovements(data as any); // Casting since Supabase types might be complex to infer fully here without importing Database
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }

    if (!isOpen) return null;

    function getIcon(type: string) {
        switch (type) {
            case 'IN': return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
            case 'OUT': return <ArrowUpRight className="w-4 h-4 text-red-500" />;
            case 'SALE': return <ShoppingCart className="w-4 h-4 text-blue-500" />;
            case 'PURCHASE': return <Truck className="w-4 h-4 text-emerald-600" />;
            case 'ADJUSTMENT': return <ArrowRightLeft className="w-4 h-4 text-amber-500" />;
            default: return <ArrowRightLeft className="w-4 h-4 text-slate-400" />;
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
                    <div>
                        <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Kardex de Movimientos</h3>
                        <p className="text-xs text-zinc-500">{productName}</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">&times;</button>
                </div>

                <div className="flex-1 overflow-auto p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs uppercase text-zinc-500 font-semibold sticky top-0">
                            <tr>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3">Tipo</th>
                                <th className="px-6 py-3">Motivo</th>
                                <th className="px-6 py-3 text-right">Cantidad</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {isLoading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-zinc-500"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></td></tr>
                            ) : movements.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-zinc-500">No hay movimientos registrados.</td></tr>
                            ) : (
                                movements.map((m) => (
                                    <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-3 text-zinc-500 whitespace-nowrap">
                                            {format(new Date(m.createdAt), 'dd MMM yyyy HH:mm', { locale: es })}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                {getIcon(m.type)}
                                                <span className="font-medium text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{m.type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-zinc-600 dark:text-zinc-300">
                                            {m.reason || '-'}
                                        </td>
                                        <td className={`px-6 py-3 text-right font-mono font-medium ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {m.quantity > 0 ? '+' : ''}{m.quantity}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-800 dark:text-zinc-400">Cerrar</button>
                </div>
            </div>
        </div>
    );
}
