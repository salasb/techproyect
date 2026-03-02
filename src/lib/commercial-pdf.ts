import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PdfItem {
    detail: string;
    quantity: number;
    unit: string;
    priceNet: number;
    totalNet: number;
}

interface PdfData {
    number: string;
    version?: number;
    date: Date;
    dueDate?: Date;
    clientName: string;
    clientTaxId?: string;
    clientAddress?: string;
    projectName: string;
    items: PdfItem[];
    subtotal: number;
    tax: number;
    total: number;
    terms?: string;
    type: 'QUOTE' | 'INVOICE';
}

export function generateCommercialPdf(data: PdfData) {
    const doc = new jsPDF();
    const isQuote = data.type === 'QUOTE';
    const title = isQuote ? `COTIZACIÓN #${data.number}` : `FACTURA #${data.number}`;

    // 1. Header: TechWise Info
    doc.addImage("/techwise logo negro.png", "PNG", 14, 10, 35, 12);
    
    doc.setFontSize(9);
    doc.setTextColor(80);
    const rightX = 196;
    doc.text("TechWise SpA", rightX, 14, { align: 'right' });
    doc.text("RUT: 77.966.773-1", rightX, 19, { align: 'right' });
    doc.text("Av. Las Condes 10465, Of. 045 A", rightX, 24, { align: 'right' });
    doc.text("contacto@techwise.cl", rightX, 29, { align: 'right' });

    // 2. Title and Version
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 45);
    if (isQuote && data.version) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(`Versión: v${data.version}`, 14, 52);
    }

    // 3. Client & Project Info
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE:", 14, 65);
    doc.setFont("helvetica", "normal");
    doc.text(data.clientName, 45, 65);
    if (data.clientTaxId) doc.text(`RUT: ${data.clientTaxId}`, 45, 70);
    if (data.clientAddress) doc.text(data.clientAddress, 45, 75);

    doc.setFont("helvetica", "bold");
    doc.text("PROYECTO:", 14, 85);
    doc.setFont("helvetica", "normal");
    doc.text(data.projectName, 45, 85);

    doc.setFont("helvetica", "bold");
    doc.text("FECHA:", 130, 65);
    doc.setFont("helvetica", "normal");
    doc.text(format(data.date, 'dd/MM/yyyy'), 160, 65);

    if (data.dueDate) {
        doc.setFont("helvetica", "bold");
        doc.text("VENCE:", 130, 70);
        doc.setFont("helvetica", "normal");
        doc.text(format(data.dueDate, 'dd/MM/yyyy'), 160, 70);
    }

    // 4. Items Table
    const tableHeaders = [['DESCRIPCIÓN', 'CANT', 'UNID', 'P. UNIT', 'TOTAL']];
    const tableRows = data.items.map(item => [
        item.detail,
        item.quantity.toString(),
        item.unit,
        `$${item.priceNet.toLocaleString('es-CL')}`,
        `$${item.totalNet.toLocaleString('es-CL')}`
    ]);

    autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 95,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], fontSize: 9 },
        styles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 80 },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'right' }
        }
    });

    // 5. Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const summaryX = 140;

    doc.setFontSize(9);
    doc.text("SUBTOTAL NETO:", summaryX, finalY);
    doc.text(`$${data.subtotal.toLocaleString('es-CL')}`, rightX, finalY, { align: 'right' });

    doc.text("IVA (19%):", summaryX, finalY + 6);
    doc.text(`$${data.tax.toLocaleString('es-CL')}`, rightX, finalY + 6, { align: 'right' });

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", summaryX, finalY + 14);
    doc.text(`$${data.total.toLocaleString('es-CL')}`, rightX, finalY + 14, { align: 'right' });

    // 6. Terms & Conditions
    if (data.terms) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100);
        doc.text("TÉRMINOS Y CONDICIONES:", 14, finalY + 30);
        doc.setFont("helvetica", "normal");
        const splitTerms = doc.splitTextToSize(data.terms, 180);
        doc.text(splitTerms, 14, finalY + 35);
    }

    // 7. Footer
    doc.setFontSize(7);
    doc.setTextColor(150);
    const footerText = isQuote 
        ? "Esta cotización tiene una validez de 15 días. Precios sujetos a cambios según disponibilidad."
        : "Gracias por su preferencia. Favor realizar el pago antes de la fecha de vencimiento.";
    doc.text(footerText, 105, 285, { align: 'center' });

    return doc;
}

export function downloadCommercialPdf(data: PdfData) {
    const doc = generateCommercialPdf(data);
    const filename = `${data.type.toLowerCase()}_${data.number}.pdf`;
    doc.save(filename);
}
