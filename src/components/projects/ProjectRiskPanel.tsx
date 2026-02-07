'use client';

import { RiskAnalysis } from "@/services/riskEngine";
import { RiskBadge } from "./RiskBadge";
import { AlertTriangle, TrendingDown, Clock, Banknote, Info, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ProjectRiskPanel({ risk }: { risk: RiskAnalysis }) {
    return (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-primary" />
                    Análisis de Viabilidad (IA)
                </h3>
                <RiskBadge level={risk.level} score={risk.score} showScore />
            </div>

            <div className="p-6 grid gap-6 md:grid-cols-2">
                {/* Left: Gauge & Score */}
                <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg">
                    <div className="relative w-32 h-16 overflow-hidden mb-2">
                        {/* Simple CSS Gauge */}
                        <div className="absolute top-0 left-0 w-full h-full bg-slate-200 rounded-t-full"></div>
                        <div
                            className={`absolute top-0 left-0 w-full h-full rounded-t-full origin-bottom transition-all duration-1000 ${risk.level === 'HIGH' ? 'bg-red-500' : risk.level === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                            style={{ transform: `rotate(${(risk.score / 100) * 180 - 180}deg)` }}
                        ></div>
                    </div>
                    <span className="text-3xl font-bold">{risk.score}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Score de Riesgo</span>
                </div>

                {/* Right: Factors & Context */}
                <div className="space-y-4">
                    {/* New Human Context */}
                    <div className={`p-3 rounded-lg border text-sm flex items-start gap-2 ${risk.level === 'HIGH' ? 'bg-red-50 border-red-100 text-red-800 dark:bg-red-900/10 dark:border-red-900/20' :
                            risk.level === 'MEDIUM' ? 'bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-900/10 dark:border-amber-900/20' :
                                'bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-900/10 dark:border-blue-900/20'
                        }`}>
                        <Sparkles className="w-4 h-4 mt-0.5 shrink-0 opacity-70" />
                        <p className="leading-snug">{risk.context}</p>
                    </div>

                    <div className="pl-1">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Factores Clave</h4>
                        {risk.factors.length > 0 ? (
                            <ul className="space-y-2">
                                {risk.factors.map((factor, i) => (
                                    <li key={i} className="text-sm flex items-start gap-2 text-foreground/90">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                        {factor}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No se han detectado factores de riesgo críticos.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 divide-x border-t border-border bg-muted/10">
                <div className="p-3 text-center">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1 cursor-help">
                                    <Clock className="w-3 h-3" /> SPI
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="font-semibold">Schedule Performance Index</p>
                                <p className="text-xs">Mide el avance vs tiempo. &lt; 1.0 es retraso.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <div className={`font-mono font-medium ${risk.details.spi < 0.9 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {risk.details.spi.toFixed(2)}
                    </div>
                </div>
                <div className="p-3 text-center">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1 cursor-help">
                                    <TrendingDown className="w-3 h-3" /> CPI
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="font-semibold">Cost Performance Index</p>
                                <p className="text-xs">Mide eficiencia de gasto. &lt; 1.0 es sobrecosto.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <div className={`font-mono font-medium ${risk.details.cpi < 0.9 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {risk.details.cpi.toFixed(2)}
                    </div>
                </div>
                <div className="p-3 text-center">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1 cursor-help">
                                    <Banknote className="w-3 h-3" /> Liquidez
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="font-semibold">Riesgo de Liquidez</p>
                                <p className="text-xs">% de facturación vencida impaga.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <div className={`font-mono font-medium ${risk.details.liquidityRisk > 0.3 ? 'text-red-600' : risk.details.liquidityRisk > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {(risk.details.liquidityRisk * 100).toFixed(0)}%
                    </div>
                </div>
            </div>
        </div>
    );
}
