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
}

interface Props {
    blockedProjects: ProjectSummary[];
    activeProjects: ProjectSummary[];
}

export function FocusBoard({ blockedProjects, activeProjects }: Props) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Blocked Projects - High Priority */}
            <div className={`rounded-xl border border-red-200 bg-red-50/50 p-6 ${blockedProjects.length === 0 ? 'opacity-70' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-red-900 flex items-center">
                        <AlertOctagon className="w-5 h-5 mr-2 text-red-600" />
                        Bloqueos / Atención Inmediata
                        {blockedProjects.length > 0 && (
                            <span className="ml-2 bg-red-200 text-red-800 text-xs px-2 py-0.5 rounded-full font-bold">
                                {blockedProjects.length}
                            </span>
                        )}
                    </h3>
                </div>

                {blockedProjects.length === 0 ? (
                    <div className="text-sm text-red-700/60 italic flex items-center justify-center h-20 border border-dashed border-red-200 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Todo fluye correctamente
                    </div>
                ) : (
                    <div className="space-y-3">
                        {blockedProjects.map((project) => (
                            <Link key={project.id} href={`/projects/${project.id}`}>
                                <div className="bg-white p-3 rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                                            {project.companyName}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">{project.id}</span>
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
                )}
            </div>

            {/* Active Projects - Focus Today */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-blue-900 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />
                        Foco de Hoy
                        <span className="ml-2 text-xs text-blue-700 font-normal">(Próximas Acciones)</span>
                    </h3>
                </div>

                {activeProjects.length === 0 ? (
                    <div className="text-sm text-blue-700/60 italic flex items-center justify-center h-20 border border-dashed border-blue-200 rounded-lg">
                        Nada pendiente para hoy
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeProjects.slice(0, 3).map((project) => (
                            <Link key={project.id} href={`/projects/${project.id}`}>
                                <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                            {project.companyName}
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                    <h4 className="font-bold text-foreground text-sm line-clamp-1">{project.name}</h4>
                                    <p className="text-xs text-slate-600 mt-2 flex items-center">
                                        <span className="w-2 h-2 rounded-full bg-blue-400 mr-2"></span>
                                        {project.nextAction || "Sin próxima acción definida"}
                                    </p>
                                </div>
                            </Link>
                        ))}
                        <div className="text-center pt-2">
                            <Link href="/projects" className="text-xs font-semibold text-blue-600 hover:underline">
                                Ver todos los proyectos activos
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
