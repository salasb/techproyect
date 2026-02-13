'use client'

import { useState } from "react";
import { Loader2, Sparkles, AlertTriangle, CheckCircle, TrendingUp, Info } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface AuditResult {
    healthScore: number;
    summary: string;
    issues: {
        title: string;
        severity: 'CRITICAL' | 'WARNING' | 'INFO';
        description: string;
    }[];
    recommendations: string[];
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}

export default function ProjectFinancialAuditor({ projectId }: { projectId: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [audit, setAudit] = useState<AuditResult | null>(null);
    const { toast } = useToast();

    async function handleAudit() {
        setIsLoading(true);
        try {
            const res = await fetch('/api/ai/project-audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId })
            });

            if (!res.ok) throw new Error("Audit failed");

            const data = await res.json();
            setAudit(data);
        } catch (error) {
            console.error(error);
            toast({ type: 'error', message: "Error al realizar la auditoría IA" });
        } finally {
            setIsLoading(false);
        }
    }

    if (!audit && !isLoading) {
        return (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-6 text-center">
                <Sparkles className="w-8 h-8 mx-auto text-indigo-500 mb-2" />
                <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-300">Auditoría Financiera IA</h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-400 mb-4 max-w-sm mx-auto">
                    Analiza automáticamente tus costos, márgenes y riesgos utilizando Inteligencia Artificial.
                </p>
                <button
                    onClick={handleAudit}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg flex items-center mx-auto"
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Ejecutar Auditoría
                </button>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    Reporte de Auditoría
                </h3>
                {isLoading ? (
                    <span className="text-xs text-muted-foreground flex items-center">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analizando...
                    </span>
                ) : (
                    <button onClick={handleAudit} className="text-xs text-indigo-600 hover:underline">
                        Re-analizar
                    </button>
                )}
            </div>

            {isLoading && !audit && (
                <div className="p-8 text-center bg-background/50">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground animate-pulse">Analizando finanzas del proyecto...</p>
                </div>
            )}

            {audit && (
                <div className="p-6">
                    {/* Header Score */}
                    <div className="flex items-center gap-6 mb-6">
                        <div className="relative w-20 h-20 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    className="text-gray-200 dark:text-gray-700"
                                    strokeWidth="8"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="32"
                                    cx="40"
                                    cy="40"
                                />
                                <circle
                                    className={`${audit.healthScore > 80 ? 'text-green-500' : audit.healthScore > 50 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                                    strokeWidth="8"
                                    strokeDasharray={201} // 2 * pi * 32
                                    strokeDashoffset={201 - (201 * audit.healthScore) / 100}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="32"
                                    cx="40"
                                    cy="40"
                                />
                            </svg>
                            <span className="absolute text-xl font-bold">{audit.healthScore}</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{audit.summary}</p>
                            <div className="flex gap-2 mt-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border
                                    ${audit.sentiment === 'POSITIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                                        audit.sentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                    {audit.sentiment === 'POSITIVE' ? 'Positivo' : audit.sentiment === 'NEGATIVE' ? 'Negativo' : 'Neutral'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Issues List */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Alertas Detectadas</h4>
                            {audit.issues.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No se detectaron problemas críticos.</p>
                            ) : (
                                audit.issues.map((issue, i) => (
                                    <div key={i} className={`p-3 rounded-lg border text-sm
                                        ${issue.severity === 'CRITICAL' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/10' :
                                            issue.severity === 'WARNING' ? 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/10' :
                                                'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/10'}`}>
                                        <div className="flex items-center font-semibold mb-1">
                                            {issue.severity === 'CRITICAL' ? <AlertTriangle className="w-4 h-4 mr-2" /> : <Info className="w-4 h-4 mr-2" />}
                                            {issue.title}
                                        </div>
                                        <p className="opacity-90 text-xs">{issue.description}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Recommendations */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Recomendaciones</h4>
                            {audit.recommendations.map((rec, i) => (
                                <div key={i} className="flex gap-3 text-sm text-foreground bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                    <span>{rec}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
