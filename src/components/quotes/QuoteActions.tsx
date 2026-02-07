'use client'

import { Printer, Mail, Send } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Props {
    quoteId: string;
    projectName: string;
    clientName: string;
    clientEmail: string;
}

export function QuoteActions({ quoteId, projectName, clientName, clientEmail }: Props) {
    const { toast } = useToast();

    const handlePrint = () => {
        window.print();
    };

    const handleEmail = () => {
        const subject = `Cotización #${quoteId} - Proyecto: ${projectName} - Techwise SpA`;
        const body = `Estimado(a) ${clientName},

Adjunto encontrarás la cotización #${quoteId} correspondiente al proyecto "${projectName}".

Quedamos atentos a tus comentarios y esperamos poder avanzar contigo.

Saludos cordiales,

Christian Salas
Techwise SpA
`;

        const mailtoLink = `mailto:${clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        // Open mail client
        window.location.href = mailtoLink;

        // Show toast instructions
        toast({
            type: 'info',
            message: 'Se abrió tu correo. Recuerda ADJUNTAR el PDF de la cotización.'
        });

        // Optional: Trigger print dialog automatically after a slight delay to encourage saving as PDF?
        // User said "adjunte el correo", implying they might expect the file to be there. 
        // Helping them generate the file is good UX.
        setTimeout(() => {
            // window.print(); // Maybe too aggressive? Let's leave it to user choice from the print button.
        }, 1000);
    };

    return (
        <div className="fixed bottom-8 right-8 print:hidden flex flex-col gap-3">
            <button
                onClick={handlePrint}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-full p-4 shadow-lg transition-all hover:scale-105 flex items-center gap-2 group"
                title="Imprimir / Guardar como PDF"
            >
                <Printer className="w-5 h-5" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap font-medium text-sm">
                    Imprimir
                </span>
            </button>

            <button
                onClick={handleEmail}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-105 flex items-center gap-2 group"
                title="Enviar por Correo"
            >
                <Send className="w-5 h-5 ml-0.5" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap font-medium text-sm">
                    Enviar
                </span>
            </button>
        </div>
    );
}
