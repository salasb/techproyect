'use client';

import { generateId } from "@/lib/id";

export interface OfflineAction {
    id: string;
    type: 'STOCK_ADJUSTMENT' | 'LOG_ACTIVITY' | 'TASK_COMPLETE';
    payload: any;
    timestamp: number;
}

export class OfflineQueueService {
    private static STORAGE_KEY = 'techproyect_offline_queue';

    static enqueue(type: OfflineAction['type'], payload: any) {
        if (typeof window === 'undefined') return;

        const action: OfflineAction = {
            id: generateId(),
            type,
            payload,
            timestamp: Date.now()
        };

        const queue = this.getQueue();
        queue.push(action);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    }

    /**
     * Compatibility alias for newer components.
     */
    static addToQueue(params: { type: OfflineAction['type'], payload: any }) {
        this.enqueue(params.type, params.payload);
    }

    static getQueue(): OfflineAction[] {
        if (typeof window === 'undefined') return [];
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    static async processQueue(processor: (action: OfflineAction) => Promise<void>) {
        const queue = this.getQueue();
        if (queue.length === 0) return { success: 0, fail: 0 };

        let success = 0;
        let fail = 0;
        const remaining: OfflineAction[] = [];

        for (const action of queue) {
            try {
                await processor(action);
                success++;
            } catch (err) {
                console.error(`Failed to process offline action ${action.id}:`, err);
                remaining.push(action);
                fail++;
            }
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(remaining));
        return { success, fail };
    }

    static clear() {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(this.STORAGE_KEY);
    }
}
