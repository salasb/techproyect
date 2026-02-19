"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";
import { Share2, Copy, Check, Loader2 } from "lucide-react";
// createShareLinkAction removed here as it is imported dynamically
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
    const [activeLink, setActiveLink] = useState<{
        id: string;
        createdAt: Date;
        expiresAt: Date;
        accessCount: number;
    } | null>(null);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    // Load active link when dialog opens
    const loadActiveLink = async () => {
        try {
            // dynamically import action to avoid server component issues in client if needed, 
            // but Next.js handles imports fine if 'use server' is at top of action file.
            const { getShareLinksAction } = await import("@/app/actions/share-link");
            const links = await getShareLinksAction(entityType, entityId);
            if (links && links.length > 0) {
                setActiveLink(links[0]);
            } else {
                setActiveLink(null);
            }
        } catch (e) {
            console.error("Failed to load links", e);
        }
    };

    const handleOpen = () => {
        setIsOpen(true);
        loadActiveLink();
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            // Use server action via import
            const { createShareLinkAction, revokeShareLinkAction } = await import("@/app/actions/share-link");

            // If there's an active link, revoke it first (rotation behavior)
            if (activeLink) {
                await revokeShareLinkAction(activeLink.id, entityType, entityId);
            }

            const url = await createShareLinkAction(entityType, entityId);
            setGeneratedUrl(url);
            setActiveLink(null); // Clear old link stat, show new URL
            toast({ type: "success", message: "Enlace generado correctamente" });
        } catch (error) {
            toast({ type: "error", message: "Error al generar el enlace" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevoke = async () => {
        if (!activeLink) return;
        setIsLoading(true);
        try {
            const { revokeShareLinkAction } = await import("@/app/actions/share-link");
            await revokeShareLinkAction(activeLink.id, entityType, entityId);
            setActiveLink(null);
            setGeneratedUrl(null);
            toast({ type: "success", message: "Enlace revocado" });
        } catch (error) {
            toast({ type: "error", message: "Error al revocar enlace" });
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
        setGeneratedUrl(null); // Reset URL state on close for security
    };

    return (
        <>
            <div onClick={handleOpen}>
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
                description="Gestione el acceso público a este documento."
                maxWidth="md"
            >
                <div className="space-y-6 py-4">
                    {/* State 1: New URL Generated */}
                    {generatedUrl ? (
                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900 rounded-lg">
                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                    <Check className="w-4 h-4" /> Enlace Público Activo
                                </p>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-white dark:bg-zinc-950 p-2 rounded border border-emerald-200 dark:border-emerald-800 text-xs font-mono truncate select-all">
                                        {generatedUrl}
                                    </code>
                                    <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0 h-8 w-8">
                                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/60 mt-2">
                                    ⚠️ Copie este enlace ahora. Por seguridad, no podrá verlo nuevamente.
                                </p>
                            </div>
                            <Button variant="ghost" className="w-full text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={handleRevoke}>
                                Revocar este enlace
                            </Button>
                        </div>
                    ) : activeLink ? (
                        /* State 2: Existing Active Link (Hidden) */
                        <div className="space-y-4">
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                                        <Share2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">Enlace Activo</p>
                                        <p className="text-xs text-muted-foreground">
                                            Creado el {new Date(activeLink.createdAt).toLocaleDateString()} • {activeLink.accessCount} accesos
                                        </p>
                                    </div>
                                    <div className="px-2 py-1 bg-zinc-200 dark:bg-zinc-800 rounded text-[10px] font-mono text-muted-foreground">
                                        HIDDEN
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" onClick={handleRevoke} disabled={isLoading} className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200">
                                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                                    Revocar
                                </Button>
                                <Button onClick={handleGenerate} disabled={isLoading}>
                                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                                    Generar Nuevo
                                </Button>
                            </div>
                            <p className="text-[10px] text-center text-muted-foreground px-4">
                                Generar uno nuevo revocará automáticamente el enlace anterior.
                            </p>
                        </div>
                    ) : (
                        /* State 3: No Active Link */
                        <div className="flex flex-col items-center justify-center py-6 space-y-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
                            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                                <Share2 className="w-6 h-6 text-zinc-400" />
                            </div>
                            <div className="text-center px-4">
                                <p className="text-sm font-medium">Sin enlace público</p>
                                <p className="text-xs text-muted-foreground">Nadie puede ver este documento externamente.</p>
                            </div>
                            <Button onClick={handleGenerate} disabled={isLoading} className="font-bold">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Generar Enlace Seguro
                            </Button>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
}
