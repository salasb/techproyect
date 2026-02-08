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

// Excel Export
import * as XLSX from 'xlsx';

export function downloadXlsx(data: any[], filename: string) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    XLSX.writeFile(workbook, filename);
}

// PDF Export
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function downloadPdf(data: any[], columns: { header: string, accessor: (item: any) => string | number | null | undefined }[], filename: string, title: string = 'Reporte') {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);

    // Prepare table data
    const tableColumn = columns.map(col => col.header);
    const tableRows = data.map(item => {
        return columns.map(col => {
            const val = col.accessor(item);
            return val === null || val === undefined ? '' : String(val);
        });
    });

    // Generate table
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 66, 66] }
    });

    doc.save(filename);
}
