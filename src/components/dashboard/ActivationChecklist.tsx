"use client";

import React from "react";
import { CheckCircle2, Circle, ArrowRight, Sparkles, Briefcase, Plus, Send, Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ActivationStep {
    id: string;
    label: string;
    description: string;
    completed: boolean;
    locked?: boolean;
}

interface ActivationChecklistProps {
    data: {
        items: ActivationStep[];
        progress: number;
        totalSteps: number;
        completedCount: number;
    };
}

const ICON_MAP: Record<string, any> = {
    'FIRST_PROJECT_CREATED': Briefcase,
    'ITEMS_ADDED': Plus,
    'FIRST_QUOTE_DRAFT_CREATED': Sparkles,
    'FIRST_QUOTE_SENT': Send,
};

const HREF_MAP: Record<string, string> = {
    'FIRST_PROJECT_CREATED': '/projects/new',
    'ITEMS_ADDED': '/projects',
    'FIRST_QUOTE_DRAFT_CREATED': '/projects',
    'FIRST_QUOTE_SENT': '/projects',
};

const ACTION_LABEL_MAP: Record<string, string> = {
    'FIRST_PROJECT_CREATED': 'Crear Proyecto',
    'ITEMS_ADDED': 'Ir a Proyectos',
    'FIRST_QUOTE_DRAFT_CREATED': 'Generar Propuesta',
    'FIRST_QUOTE_SENT': 'Ver Cotizaciones',
};

export function ActivationChecklist({ data }: ActivationChecklistProps) {
    const { items, progress, completedCount, totalSteps } = data;

    // Rule: If all steps are completed, don't show the guide
    if (completedCount === totalSteps && totalSteps > 0) return null;

    return (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden mb-8 animate-in fade-in duration-500">
            <div className="p-6 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Guía de Activación</h3>
                        <p className="text-xs text-muted-foreground italic">Comienza tu flujo comercial en TechWise.</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="w-48 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest italic">
                        {progress}% Completado
                    </span>
                </div>
            </div>

            <div className="divide-y divide-border">
                {items.map((step, idx) => {
                    const Icon = ICON_MAP[step.id] || Circle;
                    const isNext = !step.completed && !step.locked;

                    return (
                        <div
                            key={step.id}
                            className={cn(
                                "p-4 transition-all duration-300 flex items-start gap-4",
                                step.locked && "opacity-40 grayscale select-none",
                                isNext && "bg-primary/[0.02]"
                            )}
                        >
                            <div className="mt-1">
                                {step.completed ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : step.locked ? (
                                    <Lock className="w-5 h-5 text-zinc-300" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-primary/30 flex items-center justify-center group-hover:border-primary">
                                        <div className="w-2 h-2 rounded-full bg-primary/20" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className={cn(
                                        "text-sm font-bold tracking-tight",
                                        step.completed ? "text-zinc-400 line-through" : "text-foreground"
                                    )}>
                                        {step.label}
                                    </h4>
                                    {isNext && (
                                        <Link href={HREF_MAP[step.id] || '#'}>
                                            <button className="text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-3 py-1 rounded-lg hover:bg-primary/90 transition-all shadow-md shadow-primary/10 flex items-center gap-1.5">
                                                {ACTION_LABEL_MAP[step.id]} <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </Link>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                                    {step.description}
                                </p>
                                {step.locked && idx > 0 && (
                                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter flex items-center gap-1">
                                        <Lock className="w-2.5 h-2.5" /> Requiere completar: "{items[idx-1].label}"
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
