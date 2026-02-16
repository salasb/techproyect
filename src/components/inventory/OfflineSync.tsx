'use client';

import { useEffect } from 'react';
import { OfflineQueueService } from '@/services/offlineQueue';
import { adjustStock } from '@/app/actions/inventory';
import { useToast } from "@/components/ui/Toast";

export function OfflineSync() {
    const { toast } = useToast();

    useEffect(() => {
        function handleOnline() {
            // Process Logic
            OfflineQueueService.processQueue(async (action) => {
                if (action.type === 'STOCK_ADJUSTMENT') {
                    const { productId, quantity, type, fromLocation, toLocation, reason } = action.payload;
                    const result = await adjustStock(productId, quantity, type, fromLocation, toLocation, reason);
                    if (result.error) throw new Error(result.error);
                }
            }).then(({ success, fail }) => {
                if (success > 0) {
                    toast({ type: 'success', message: `${success} movimientos sincronizados.` });
                }
                if (fail > 0) {
                    toast({ type: 'error', message: `${fail} movimientos fallaron al sincronizar.` });
                }
            });
        }

        window.addEventListener('online', handleOnline);

        // Initial check if we just loaded and have pending items
        if (typeof navigator !== 'undefined' && navigator.onLine) {
            handleOnline();
        }

        return () => window.removeEventListener('online', handleOnline);
    }, [toast]);

    return null;
}
