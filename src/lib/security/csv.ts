/**
 * Sanitizes data for CSV export to prevent Formula Injection (CSV Injection).
 * Escapes fields starting with =, +, -, @ to prevent Excel/Sheets from executing them as formulas.
 */
export function sanitizeForCsv(value: any): string {
    if (value === null || value === undefined) {
        return '';
    }

    const stringValue = String(value);

    // Prevent Formula Injection
    if (/^[=+\-@]/.test(stringValue)) {
        return `'${stringValue}`; // Prefix with single quote to force text interpretation
    }

    return stringValue;
}

/**
 * Generates a CSV string from an array of objects.
 */
export function generateCsv(data: Record<string, any>[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','), // Header row
        ...data.map(row => {
            return headers.map(fieldName => {
                const val = row[fieldName];
                const sanitized = sanitizeForCsv(val);
                // Escape quotes and wrap in quotes if necessary
                const escaped = sanitized.replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(',');
        })
    ];

    return csvRows.join('\n');
}
