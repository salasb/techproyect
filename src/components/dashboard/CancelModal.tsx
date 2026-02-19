"use client"

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    AlertCircle, Pause, MessageSquare, ArrowRight, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CancellationReason } from "@prisma/client";

interface CancelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: CancellationReason, comment?: string) => Promise<void>;
    variant: 'CONTINUITY' | 'VALUE_ROI';
}

export function CancelModal({ isOpen, onClose, onConfirm, variant }: CancelModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [reason, setReason] = useState<CancellationReason | ''>('');
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const reasons: { value: CancellationReason; label: string }[] = [
        { value: 'PRICE', label: 'Es muy caro' },
        { value: 'MISSING_FEATURE', label: 'Falta alguna funcionalidad' },
        { value: 'HARD_TO_USE', label: 'Es difícil de usar' },
        { value: 'NOT_USING_IT', label: 'No lo estoy usando' },
        { value: 'BUGS', label: 'Tengo errores técnicos' },
        { value: 'SWITCHING_COMPETITOR', label: 'Me cambio a la competencia' },
        { value: 'OTHER', label: 'Otro motivo' }
    ];

    const handleSubmit = async () => {
        if (!reason) return;
        setIsSubmitting(true);
        try {
            await onConfirm(reason as CancellationReason, comment);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl w-full max-w-[450px] overflow-hidden animate-in zoom-in-95 duration-300 border border-zinc-200 dark:border-zinc-800 z-10">
                <div className="bg-gradient-to-br from-zinc-900 to-black p-8 text-white text-center relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                        <AlertCircle className="w-7 h-7 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">
                        ¿Estás seguro de que quieres irte?
                    </h2>
                    <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                        {variant === 'CONTINUITY'
                            ? "Si cancelas ahora, perderás el acceso a todo el historial de proyectos y auditorías acumuladas."
                            : "Nuestros usuarios ahorran un promedio de 12 horas al mes gestionando proyectos con TechProyect."
                        }
                    </p>
                </div>

                {step === 1 ? (
                    <div className="p-8 space-y-8">
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Considera estas alternativas:</p>
                            <div className="grid gap-3">
                                <button className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-primary hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all text-left group">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                                        <Pause className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold">Pausar Suscripción</p>
                                        <p className="text-[11px] text-zinc-500">Mantén tus datos por 30 días sin costo.</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-primary transition-colors" />
                                </button>

                                <button className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-primary hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all text-left group">
                                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
                                        <MessageSquare className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold">Hablar con Soporte</p>
                                        <p className="text-[11px] text-zinc-500">¿Podemos ayudarte con algo técnico?</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-primary transition-colors" />
                                </button>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            className="w-full text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 font-bold transition-all"
                            onClick={() => setStep(2)}
                        >
                            Quiero proceder con la cancelación
                        </Button>
                    </div>
                ) : (
                    <div className="p-8 space-y-6">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">¿Cuál es el motivo principal?</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value as CancellationReason)}
                                className="w-full p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            >
                                <option value="" disabled>Selecciona una razón...</option>
                                {reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>

                            <textarea
                                placeholder="Cualquier comentario adicional nos ayuda mucho..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="w-full p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm min-h-[120px] outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-2xl h-12 font-bold">
                                Volver
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1 rounded-2xl h-12 bg-red-600 hover:bg-red-700 font-bold shadow-lg shadow-red-500/20"
                                disabled={!reason || isSubmitting}
                                onClick={handleSubmit}
                            >
                                {isSubmitting ? "Procesando..." : "Confirmar"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
