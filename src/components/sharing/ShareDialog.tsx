"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";
import { Share2, Copy, Check, Loader2 } from "lucide-react";
import { createShareLinkAction } from "@/app/actions/share-link";
import { ShareLinkType } from "@prisma/client";
import { useToast } from "@/components/ui/Toast";

interface ShareDialogProps {
    entityType: ShareLinkType;
    entityId: string;
    trigger?: React.ReactNode;
}

export function ShareDialog({ entityType, entityId, trigger }: ShareDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const url = await createShareLinkAction(entityType, entityId);
            setGeneratedUrl(url);
        } catch (error) {
            toast({ type: "error", message: "Error al generar el enlace" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (!generatedUrl) return;
        navigator.clipboard.writeText(generatedUrl);
        setCopied(true);
        toast({ type: "success", message: "Copiado al portapapeles" });
        setTimeout(() => setCopied(false), 2000);
    };

    const onClose = () => {
        setIsOpen(false);
        // Optional: clear url on close? No, better keep it if they reopen.
    };

    return (
        <>
            <div onClick={() => setIsOpen(true)}>
                {trigger || (
                    <Button variant="outline" className="gap-2 text-xs h-8">
                        <Share2 className="w-3.5 h-3.5" /> Compartir
                    </Button>
                )}
            </div>

            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={`Compartir ${entityType === 'QUOTE' ? 'Cotización' : 'Factura'}`}
                description="Genera un enlace público seguro para que tu cliente pueda ver este documento."
                maxWidth="md"
            >
                <div className="space-y-4 py-4">
                    {!generatedUrl ? (
                        <div className="flex flex-col items-center justify-center py-6 space-y-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800">
                            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                                <Share2 className="w-6 h-6 text-zinc-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium">Listo para compartir</p>
                                <p className="text-xs text-muted-foreground">El enlace expirará por defecto en 30 días.</p>
                            </div>
                            <Button onClick={handleGenerate} disabled={isLoading} className="font-bold">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Generar Enlace Seguro
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900 rounded-lg">
                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2 uppercase tracking-wider">Enlace Público Activo</p>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-white dark:bg-zinc-950 p-2 rounded border border-emerald-200 dark:border-emerald-800 text-xs font-mono truncate">
                                        {generatedUrl}
                                    </code>
                                    <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0 h-8 w-8">
                                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-center text-muted-foreground">
                                Cualquiera con este enlace podrá ver el documento.
                            </p>
                            <Button variant="ghost" className="w-full text-xs" onClick={() => setGeneratedUrl(null)}>
                                Generar otro enlace
                            </Button>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
}
