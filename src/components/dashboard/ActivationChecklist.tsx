"use client";

import React from "react";
import { CheckCircle2, Circle, ArrowRight, Sparkles, Briefcase, Plus, Send, Users, Package } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ActivationChecklistProps {
    stats: any;
    orgMode: 'SOLO' | 'TEAM';
}

export function ActivationChecklist({ stats, orgMode }: ActivationChecklistProps) {
    const attributes = stats?.attributes || {};

    const allSteps = [
        {
            id: "FIRST_PROJECT_CREATED",
            title: "Crea tu primer proyecto",
            description: "Define el nombre y presupuesto para organizar tus costos.",
            icon: Briefcase,
            completed: !!attributes.FIRST_PROJECT_CREATED,
            href: "/projects/new",
            actionLabel: "Crear Proyecto",
            why: "Importante para centralizar toda la documentación comercial."
        },
        {
            id: "FIRST_QUOTE_DRAFT_CREATED",
            title: "Crea un borrador de cotización",
            description: "Agrega ítems, materiales o servicios a tu proyecto.",
            icon: Plus,
            completed: !!attributes.FIRST_QUOTE_DRAFT_CREATED,
            href: "/projects",
            actionLabel: "Ver Proyectos",
            why: "Permite proyectar márgenes y utilidades antes de enviar."
        },
        {
            id: "FIRST_QUOTE_SENT",
            title: "Envía la primera cotización",
            description: "Descarga el PDF o envíalo directamente al cliente.",
            icon: Send,
            completed: !!attributes.FIRST_QUOTE_SENT,
            href: "/projects",
            actionLabel: "Ver Cotizaciones",
            why: "Acelera el cierre de negocios con formatos profesionales."
        },
        {
            id: "FIRST_TEAM_INVITE_SENT",
            title: "Invita a un colaborador",
            description: "Trabaja en equipo y comparte la carga administrativa.",
            icon: Users,
            completed: !!attributes.FIRST_TEAM_INVITE_SENT,
            href: "/settings/team",
            actionLabel: "Gestionar Equipo",
            why: "El modo TEAM es 3x más efectivo para gestionar múltiples proyectos.",
            onlyTeam: true
        }
    ];

    const steps = allSteps.filter(s => !s.onlyTeam || orgMode === 'TEAM');
    const completedCount = steps.filter((s) => s.completed).length;
    const progressPercent = Math.round((completedCount / steps.length) * 100);

    // If fully activated, maybe show a "Great job" or hide
    if (completedCount === steps.length) return null;

    return (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden mb-8">
            <div className="p-6 border-b border-border bg-zinc-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Guía de Activación</h3>
                        <p className="text-xs text-muted-foreground">Completa estos pasos para dominar TechWise.</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="w-48 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">
                        {progressPercent}% Completado
                    </span>
                </div>
            </div>

            <div className="divide-y divide-border">
                {steps.map((step, idx) => {
                    const Icon = step.icon;
                    const isNext = !step.completed && (idx === 0 || steps[idx - 1].completed);

                    return (
                        <div
                            key={step.id}
                            className={cn(
                                "p-4 transition-all duration-300 flex items-start gap-4",
                                !step.completed && !isNext && "opacity-40 grayscale pointer-events-none",
                                isNext && "bg-primary/[0.01]"
                            )}
                        >
                            <div className="mt-1">
                                {step.completed ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : isNext ? (
                                    <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                ) : (
                                    <Circle className="w-5 h-5 text-zinc-300" />
                                )}
                            </div>

                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className={cn(
                                        "text-sm font-bold",
                                        step.completed ? "text-zinc-400 line-through" : "text-foreground"
                                    )}>
                                        {step.title}
                                    </h4>
                                    {isNext && (
                                        <Link href={step.href}>
                                            <button className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1">
                                                {step.actionLabel} <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </Link>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                                <p className="text-[10px] italic text-zinc-400 font-medium">✨ {step.why}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
