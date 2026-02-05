'use client'

import React from 'react';
import Link from "next/link";
import { AlertOctagon, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

interface ProjectSummary {
    id: string;
    name: string;
    status: string;
    companyName: string;
    nextAction: string | null;
    nextActionDate: string | null;
    blockingReason: string | null;
    companyContactName?: string | null;
    companyPhone?: string | null;
    companyEmail?: string | null;
}

interface Props {
    blockedProjects: ProjectSummary[];
    activeProjects: ProjectSummary[];
}

export function FocusBoard({ blockedProjects, activeProjects }: Props) {
    return (

        <div className={`grid grid-cols-1 ${blockedProjects.length > 0 ? 'md:grid-cols-2' : ''} gap-6 mb-8`}>
            {/* Blocked Projects - Only show if there are items */}
            {blockedProjects.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-red-900 flex items-center">
                            <AlertOctagon className="w-5 h-5 mr-2 text-red-600" />
                            Bloqueos / Atención Inmediata
                            <span className="ml-2 bg-red-200 text-red-800 text-xs px-2 py-0.5 rounded-full font-bold">
                                {blockedProjects.length}
                            </span>
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {blockedProjects.map((project) => (
                            <Link key={project.id} href={`/projects/${project.id}`}>
                                <div className="bg-white p-3 rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                                            {project.companyName}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">{project.id.substring(0, 8)}...</span>
                                    </div>
                                    <h4 className="font-bold text-foreground text-sm line-clamp-1">{project.name}</h4>
                                    <p className="text-xs text-red-700 mt-2 font-medium flex items-start">
                                        <span className="mr-1">⛔</span>
                                        {project.blockingReason || "Bloqueado sin motivo especificado"}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Projects - Focus Today */}
            <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-blue-900 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />
                        Foco de Hoy
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Próximas Acciones</span>
                    </h3>
                </div>

                {activeProjects.length === 0 ? (
                    <div className="text-sm text-blue-700/60 italic flex items-center justify-center h-20 border border-dashed border-blue-200 rounded-lg">
                        Nada pendiente para hoy
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeProjects.slice(0, 3).map((project) => {
                            // Smart Action Detection
                            const actionText = project.nextAction?.toLowerCase() || "";
                            const isCall = actionText.includes("llamar") || actionText.includes("call") || actionText.includes("telefono") || actionText.includes("celular");
                            const isEmail = actionText.includes("correo") || actionText.includes("email") || actionText.includes("enviar") || actionText.includes("mail");

                            // Determine contact data
                            const showCallAction = isCall && project.companyPhone;
                            const showEmailAction = isEmail && project.companyEmail;

                            return (
                                <div key={project.id} className="relative group">
                                    <Link href={`/projects/${project.id}`}>
                                        <div className="bg-white p-3.5 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-blue-300">
                                            <div className="flex justify-between items-start mb-1.5">
                                                <span className="text-[11px] font-bold tracking-wide text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">
                                                    {project.companyName}
                                                </span>
                                                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors transform group-hover:translate-x-0.5" />
                                            </div>
                                            <h4 className="font-bold text-foreground text-sm line-clamp-1 group-hover:text-blue-700 transition-colors">{project.name}</h4>

                                            <div className="mt-2 flex items-center text-xs justify-between">
                                                <div className="flex items-center text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 max-w-[70%]">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-2 animate-pulse min-w-[6px]"></span>
                                                    <span className="truncate">{project.nextAction || "Seguimiento General"}</span>
                                                </div>

                                                {project.nextActionDate && (
                                                    <span className={`font-mono ml-2 whitespace-nowrap ${new Date(project.nextActionDate) < new Date() ? 'text-red-600 font-bold' : 'text-slate-400'
                                                        }`}>
                                                        {new Date(project.nextActionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>

                                    {/* Proactive Action Buttons overlay (or inserted) */}
                                    {(showCallAction || showEmailAction) && (
                                        <div className="mt-2 ml-4 flex gap-2">
                                            {showCallAction && (
                                                <a href={`tel:${project.companyPhone}`}
                                                    className="flex items-center text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-md hover:bg-green-100 transition-colors font-medium shadow-sm"
                                                    onClick={(e) => e.stopPropagation()}>
                                                    <span className="mr-1.5">📞</span>
                                                    Llamar a {project.companyContactName?.split(' ')[0] || 'Cliente'} ({project.companyPhone})
                                                </a>
                                            )}
                                            {showEmailAction && (
                                                <a href={`mailto:${project.companyEmail}`}
                                                    className="flex items-center text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-md hover:bg-indigo-100 transition-colors font-medium shadow-sm"
                                                    onClick={(e) => e.stopPropagation()}>
                                                    <span className="mr-1.5">✉️</span>
                                                    Enviar Correo
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div className="text-center pt-2">
                            <Link href="/projects" className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                                Ver todos los proyectos activos &rarr;
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
