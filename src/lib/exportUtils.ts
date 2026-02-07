import { format } from "date-fns";

export function jsonToCsv(data: any[], columns: { header: string, accessor: (item: any) => string | number | null | undefined }[]) {
    // 1. Create Header Row
    const headers = columns.map(col => `"${col.header}"`).join(",");

    // 2. Create Data Rows
    const rows = data.map(item => {
        return columns.map(col => {
            const val = col.accessor(item);
            // Handle null/undefined
            if (val === null || val === undefined) return '""';
            // Escape quotes in string
            const strVal = String(val).replace(/"/g, '""');
            return `"${strVal}"`;
        }).join(",");
    });

    return [headers, ...rows].join("\n");
}

export function downloadCsv(csvContent: string, filename: string) {
    // Add BOM for Excel compatibility with UTF-8
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
