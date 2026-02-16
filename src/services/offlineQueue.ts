'use client';

export interface OfflineAction {
    id: string;
    type: 'STOCK_ADJUSTMENT' | 'STOCK_TRANSFER';
    timestamp: number;
    payload: any;
    status: 'PENDING' | 'SYNCING' | 'FAILED';
    retryCount: number;
}

const STORAGE_KEY = 'inventory_offline_queue';

export class OfflineQueueService {

    static getQueue(): OfflineAction[] {
        if (typeof window === 'undefined') return [];
        const raw = localStorage.getItem(STORAGE_KEY);
        try {
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    static addToQueue(actionContext: Omit<OfflineAction, 'id' | 'timestamp' | 'status' | 'retryCount'>) {
        const queue = this.getQueue();
        const newAction: OfflineAction = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            status: 'PENDING',
            retryCount: 0,
            ...actionContext
        };
        queue.push(newAction);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
        return true;
    }

    static remove(id: string) {
        const queue = this.getQueue().filter(a => a.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }

    static async processQueue(syncFunction: (action: OfflineAction) => Promise<void>): Promise<{ success: number; fail: number }> {
        if (!navigator.onLine) return { success: 0, fail: 0 };

        const queue = this.getQueue();
        if (queue.length === 0) return { success: 0, fail: 0 };

        let successCount = 0;
        let failCount = 0;

        for (const action of queue) {
            // Simple status check, though in single thread it's not strictly necessary unless async overlap
            // We'll proceed.
            try {
                await syncFunction(action);
                this.remove(action.id);
                successCount++;
            } catch (error) {
                console.error('Failed to sync action', action, error);
                failCount++;
            }
        }

        return { success: successCount, fail: failCount };
    }
}
