import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Computes a date that is N business days in the future from start date.
 * Business days are Monday-Friday.
 */
export function addBusinessDays(startDate: Date, days: number): Date {
    const result = new Date(startDate);
    let addedDays = 0;
    while (addedDays < days) {
        result.setDate(result.getDate() + 1);
        const dayOfWeek = result.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
            addedDays++;
        }
    }
    return result;
}

/**
 * Safely formats a date string or Date object.
 * Returns fallback if date is invalid or missing.
 */
export function safeFormat(date: string | Date | null | undefined, formatStr: string = "dd/MM/yyyy", fallback: string = "N/A"): string {
    if (!date) return fallback;
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return fallback;
        return format(d, formatStr, { locale: es });
    } catch (e) {
        return fallback;
    }
}
