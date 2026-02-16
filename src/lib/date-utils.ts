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
