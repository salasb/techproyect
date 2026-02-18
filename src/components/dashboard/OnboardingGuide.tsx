"use client";

import React from "react";
import { CheckCircle2, Circle, ArrowRight, Rocket, Briefcase, Plus, Send } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface OnboardingGuideProps {
    stats: any;
}

export function OnboardingGuide({ stats }: OnboardingGuideProps) {
    const attributes = stats?.attributes || {};

    const steps = [
        {
            id: "ORG_CREATED",
            title: "Cuenta creada",
            description: "Tu espacio de trabajo está listo.",
            icon: CheckCircle2,
            completed: !!attributes.ORG_CREATED,
            href: null,
        },
        {
            id: "FIRST_PROJECT_CREATED",
            title: "Crear primer proyecto",
            description: "Define un nombre y presupuesto estimado.",
            icon: Briefcase,
            completed: !!attributes.FIRST_PROJECT_CREATED,
            href: "/projects/new",
            actionLabel: "Crear proyecto",
        },
        {
            id: "FIRST_QUOTE_SENT",
            title: "Enviar primera cotización",
            description: "Agrega ítems y envía/descarga el PDF.",
            icon: Send,
            completed: !!attributes.FIRST_QUOTE_SENT,
            href: "/projects",
            actionLabel: "Ver proyectos",
        },
    ];

    const completedCount = steps.filter((s) => s.completed).length;
    const progressPercent = Math.round((completedCount / steps.length) * 100);

    if (completedCount === steps.length) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 rounded-2xl p-6 mb-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Rocket className="w-24 h-24 text-indigo-500 -rotate-12" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        ¡Hola! Vamos a activar tu cuenta <span className="text-2xl">🚀</span>
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-md">
                        Completa estos pasos para enviar tu primera cotización profesional en menos de 5 minutos.
                    </p>

                    <div className="flex items-center gap-3 mt-4">
                        <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden max-w-[200px]">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-1000 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                            {progressPercent}% completado
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
                    {steps.map((step, idx) => {
                        const Icon = step.icon;
                        const isNext = !step.completed && (idx === 0 || steps[idx - 1].completed);

                        return (
                            <div
                                key={step.id}
                                className={cn(
                                    "flex flex-col gap-2 transition-all duration-300",
                                    !step.completed && !isNext && "opacity-50 grayscale"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    {step.completed ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    ) : isNext ? (
                                        <Circle className="w-5 h-5 text-indigo-500 animate-pulse" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-700" />
                                    )}
                                    <span className={cn(
                                        "text-sm font-semibold",
                                        step.completed ? "text-foreground/70 line-through" : "text-foreground",
                                        isNext && "text-indigo-600 dark:text-indigo-400 underline decoration-indigo-500/30 underline-offset-4"
                                    )}>
                                        {step.title}
                                    </span>
                                </div>

                                {isNext && step.href && (
                                    <Link href={step.href}>
                                        <button className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors group/btn">
                                            {step.actionLabel}
                                            <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
