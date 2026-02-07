'use client';

import { RiskAnalysis } from "@/services/riskEngine";
import { RiskBadge } from "./RiskBadge";
import { AlertTriangle, TrendingDown, Clock, Banknote } from "lucide-react";

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

                {/* Right: Factors */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Factores Detectados</h4>
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
                        <p className="text-sm text-muted-foreground italic">No se han detectado factores de riesgo críticos. El proyecto avanza según lo previsto.</p>
                    )}
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 divide-x border-t border-border bg-muted/10">
                <div className="p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" /> SPI (Cronograma)
                    </div>
                    <div className={`font-mono font-medium ${risk.details.spi < 0.9 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {risk.details.spi.toFixed(2)}
                    </div>
                </div>
                <div className="p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                        <TrendingDown className="w-3 h-3" /> CPI (Costos)
                    </div>
                    <div className={`font-mono font-medium ${risk.details.cpi < 0.9 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {risk.details.cpi.toFixed(2)}
                    </div>
                </div>
                <div className="p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                        <Banknote className="w-3 h-3" /> Liquidez
                    </div>
                    <div className={`font-mono font-medium ${risk.details.liquidityRisk > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {(risk.details.liquidityRisk * 100).toFixed(0)}%
                    </div>
                </div>
            </div>
        </div>
    );
}
