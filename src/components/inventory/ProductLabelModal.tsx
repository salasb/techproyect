'use client';

import { useState, useRef } from 'react';
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";
import { Printer } from "lucide-react";
// import { useReactToPrint } from 'react-to-print'; // Optional: for better printing, or just window.print() style

interface ProductLabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any; // Type accurately if possible
}

export function ProductLabelModal({ isOpen, onClose, product }: ProductLabelModalProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const printContent = printRef.current;
        if (printContent) {
            const originalContents = document.body.innerHTML;
            const printContents = printContent.innerHTML;

            // Create a temporary iframe or window to print
            // Simple approach: replace body, print, restore. (Disruptive in React)
            // Better: Open new window
            const win = window.open('', '', 'height=500,width=500');
            if (win) {
                win.document.write('<html><head><title>Etiqueta ' + product.name + '</title>');
                win.document.write('<style>body { font-family: sans-serif; text-align: center; padding: 20px; } .label { border: 1px dashed #000; padding: 10px; display: inline-block; }</style>');
                win.document.write('</head><body>');
                win.document.write(printContents);
                win.document.write('</body></html>');
                win.document.close();
                win.print();
            }
        }
    };

    if (!isOpen || !product) return null;

    // Use ID if barcode not set, or prefer barcode
    const qrValue = product.barcode || product.id;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Etiqueta de Producto">
            <div className="flex flex-col items-center space-y-6">
                <div ref={printRef} className="bg-white p-4 border rounded-lg flex flex-col items-center">
                    <h3 className="text-lg font-bold mb-2">{product.name}</h3>
                    <div className="bg-white p-2">
                        <QRCode value={qrValue} size={150} />
                    </div>
                    <p className="text-sm font-mono mt-2">{qrValue}</p>
                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                </div>

                <div className="flex w-full justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cerrar</Button>
                    <Button onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
