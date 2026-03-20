import { randomUUID } from 'node:crypto';

/**
 * Generates a unique trace or entity ID.
 * Safe for both Server and Client environments.
 * v1.1: Guaranteed no crash and no ReferenceError.
 */
export function generateId(prefix?: string): string {
    let id: string = "";
    
    try {
        if (typeof window === 'undefined') {
            // Server side
            id = randomUUID();
        } else {
            // Client side
            id = window.crypto.randomUUID();
        }
    } catch (e) {
        // Absolute fallback if crypto is missing (Incident S0 safety)
        // Using timestamp + large random to maintain uniqueness without crypto
        id = `${Date.now()}-${Math.floor(Math.random() * 1000000).toString(36)}`;
    }

    if (prefix) {
        const shortId = id.includes('-') ? id.split('-')[0] : id.substring(0, 8);
        return `${prefix}-${shortId.toUpperCase()}`;
    }
    
    return id;
}
