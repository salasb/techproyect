'use client';

import { useState, useEffect } from 'react';
import { getKardex } from '@/app/actions/inventory';
import { Modal } from "@/components/ui/Modal";
import { Loader2, ArrowRight, ArrowRightLeft, ArrowDown, ArrowUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface KardexModalProps {
    productId: string;
    productName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function KardexModal({ productId, productName, isOpen, onClose }: KardexModalProps) {
    const [movements, setMovements] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadKardex();
        }
    }, [isOpen, productId]);

    async function loadKardex() {
        setIsLoading(true);
        try {
            const result = await getKardex(productId);
            if (result.data) {
                setMovements(result.data);
            }
        } catch (error) {
            console.error("Error loading kardex", error);
        } finally {
            setIsLoading(false);
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'IN': return <ArrowDown className="w-4 h-4 text-emerald-600" />;
            case 'PURCHASE': return <ArrowDown className="w-4 h-4 text-emerald-600" />;
            case 'OUT': return <ArrowUp className="w-4 h-4 text-red-600" />;
            case 'SALE': return <ArrowUp className="w-4 h-4 text-red-600" />;
            case 'TRANSFER': return <ArrowRightLeft className="w-4 h-4 text-blue-600" />;
            default: return <ArrowRightLeft className="w-4 h-4 text-slate-400" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'IN': return 'Entrada';
            case 'PURCHASE': return 'Compra';
            case 'OUT': return 'Salida';
            case 'SALE': return 'Venta';
            case 'TRANSFER': return 'Traslado';
            case 'ADJUSTMENT': return 'Ajuste';
            default: return type;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Kardex: ${productName}`} maxWidth="4xl">
            <div className="overflow-x-auto min-h-[300px]">
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                ) : movements.length === 0 ? (
                    <div className="text-center text-slate-500 py-10">No hay movimientos registrados.</div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                            <tr>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3 text-right">Cantidad</th>
                                <th className="px-4 py-3">Origen</th>
                                <th className="px-4 py-3">Destino</th>
                                <th className="px-4 py-3">Usuario</th>
                                <th className="px-4 py-3">Notas / Ref</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {movements.map((mov) => (
                                <tr key={mov.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                                        {format(new Date(mov.createdAt), "dd MMM yyyy HH:mm", { locale: es })}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {getTypeIcon(mov.type)}
                                            <span className="font-medium text-slate-700">{getTypeLabel(mov.type)}</span>
                                        </div>
                                    </td>
                                    <td className={`px-4 py-3 text-right font-mono font-bold ${['OUT', 'SALE'].includes(mov.type) ? 'text-red-600' : 'text-emerald-600'
                                        }`}>
                                        {['OUT', 'SALE'].includes(mov.type) ? '-' : '+'}{mov.quantity}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">
                                        {mov.fromLocation?.name || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">
                                        {mov.toLocation?.name || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">
                                        {mov.user?.name || 'Sistema'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">
                                        {[mov.reference, mov.notes].filter(Boolean).join(' - ')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Modal>
    );
}
