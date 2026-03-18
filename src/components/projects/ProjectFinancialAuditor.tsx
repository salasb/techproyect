'use client'

import { useState } from "react";
import { Loader2, Calculator, AlertTriangle, CheckCircle, TrendingUp, Info } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { performFinancialAudit, AuditResult } from "@/app/actions/audit";

export default function ProjectFinancialAuditor({ projectId }: { projectId: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [audit, setAudit] = useState<AuditResult | null>(null);
    const { toast } = useToast();

    async function handleAudit() {
        setIsLoading(true);
        try {
            const result = await performFinancialAudit(projectId);
            setAudit(result);
        } catch (error: any) {
            console.error(error);
            toast({
                type: 'error',
                message: error.message || "Error al realizar la auditoría financiera",
                duration: 5000
            });
        } finally {
            setIsLoading(false);
        }
    }

    if (!audit && !isLoading) {
        return (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-foreground uppercase tracking-tight">Auditoría Financiera</h3>
                        <p className="text-[10px] text-muted-foreground">Analiza márgenes y riesgos en tiempo real.</p>
                    </div>
                </div>
                <button
                    onClick={handleAudit}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95"
                >
                    Ejecutar
                </button>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="p-3 border-b border-border bg-muted/20 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <Calculator className="w-3.5 h-3.5 text-indigo-500" />
                    Reporte de Salud
                </h3>
                {isLoading ? (
                    <span className="text-[10px] text-muted-foreground flex items-center font-bold">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> ANALIZANDO...
                    </span>
                ) : (
                    <button onClick={handleAudit} className="text-[10px] font-bold text-indigo-600 hover:underline uppercase">
                        Recalcular
                    </button>
                )}
            </div>

            {isLoading && !audit && (
                <div className="p-6 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-2" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Analizando KPIs...</p>
                </div>
            )}

            {audit && (
                <div className="p-4 space-y-4">
                    {/* Header Score - Compact */}
                    <div className="flex items-center gap-4">
                        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle className="text-gray-100 dark:text-zinc-800" strokeWidth="4" stroke="currentColor" fill="transparent" r="22" cx="24" cy="24" />
                                <circle
                                    className={`${audit.healthScore > 80 ? 'text-green-500' : audit.healthScore > 50 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                                    strokeWidth="4"
                                    strokeDasharray={138} 
                                    strokeDashoffset={138 - (138 * audit.healthScore) / 100}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="22"
                                    cx="24"
                                    cy="24"
                                />
                            </svg>
                            <span className="absolute text-xs font-black">{audit.healthScore}</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground line-clamp-2 leading-tight">{audit.summary}</p>
                            <div className={`inline-block mt-1 text-[8px] px-1.5 py-0.5 rounded font-black uppercase border
                                ${audit.sentiment === 'POSITIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                                    audit.sentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700 border-red-200' :
                                        'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                {audit.sentiment === 'POSITIVE' ? 'Positivo' : audit.sentiment === 'NEGATIVE' ? 'Negativo' : 'Neutral'}
                            </div>
                        </div>
                    </div>

                    {/* Alerts - Mini List */}
                    {audit.issues.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-border">
                            {audit.issues.map((issue, i) => (
                                <div key={i} className="flex items-start gap-2 text-[10px]">
                                    {issue.severity === 'CRITICAL' ? <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" /> : <Info className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />}
                                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                                        <strong className="text-foreground">{issue.title}:</strong> {issue.description}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
