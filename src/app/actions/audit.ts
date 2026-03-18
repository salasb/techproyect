import prisma from "@/lib/prisma";

export interface AuditResult {
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

/**
 * Performs a deep financial audit of a project using Prisma (Server-only).
 * This replaces the legacy Supabase SDK call to avoid RLS/Schema public issues.
 */
export async function performFinancialAudit(projectId: string): Promise<AuditResult> {
    const traceId = `AUD-FIN-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    try {
        console.log(`[Audit][${traceId}] Starting financial audit for project=${projectId}`);

        // 1. Fetch Project Data via Prisma
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                costEntries: true,
                quoteItems: true
            }
        });

        if (!project) {
            console.error(`[Audit][${traceId}] Project not found: ${projectId}`);
            throw new Error("No se pudo encontrar el proyecto para la auditoría.");
        }

        // 2. Calculate Financials
        const budget = project.budgetNet || 0;
        const totalCosts = project.costEntries?.reduce((sum, item) => sum + item.amountNet, 0) || 0;

        // Calculate Project Value (from Quote Items)
        const totalValue = project.quoteItems?.reduce((sum, item) => sum + (item.priceNet * item.quantity), 0) || 0;

        // Margins
        const grossMargin = totalValue - totalCosts;
        const marginPct = totalValue > 0 ? (grossMargin / totalValue) : 0;
        const targetMargin = project.marginPct || 0.30;

        // 3. Rules Engine
        const issues: AuditResult['issues'] = [];
        const recommendations: string[] = [];
        let scoreDeduction = 0;

        // RULE 1: Budget Check
        if (budget > 0) {
            const usagePct = totalCosts / budget;
            if (usagePct > 1.0) {
                issues.push({
                    title: 'Presupuesto Excedido',
                    severity: 'CRITICAL',
                    description: `Los costos reales ($${totalCosts.toLocaleString('es-CL')}) superan el presupuesto ($${budget.toLocaleString('es-CL')}) en un ${((usagePct - 1) * 100).toFixed(1)}%.`
                });
                recommendations.push("Revisar costos inmediatamente y detener gastos no esenciales.");
                scoreDeduction += 40;
            } else if (usagePct > 0.85) {
                issues.push({
                    title: 'Presupuesto en Riesgo',
                    severity: 'WARNING',
                    description: `Se ha consumido el ${(usagePct * 100).toFixed(1)}% del presupuesto. Queda poco margen de maniobra.`
                });
                scoreDeduction += 15;
            }
        } else if (totalCosts > 0) {
            issues.push({
                title: 'Sin Presupuesto Definido',
                severity: 'INFO',
                description: "El proyecto tiene costos pero no tiene un presupuesto base definido para comparar."
            });
            recommendations.push("Definir un presupuesto base para tener mejor control financiero.");
            scoreDeduction += 5;
        }

        // RULE 2: Margin Check
        if (totalValue > 0) {
            if (marginPct < 0) {
                issues.push({
                    title: 'Rentabilidad Negativa',
                    severity: 'CRITICAL',
                    description: `El proyecto está perdiendo dinero. Margen actual: ${(marginPct * 100).toFixed(1)}%. Costos superan a la venta.`
                });
                recommendations.push("Reevaluar cotización o reducir alcance para recuperar rentabilidad.");
                scoreDeduction += 50;
            } else if (marginPct < targetMargin) {
                const deviation = targetMargin - marginPct;
                issues.push({
                    title: 'Margen Bajo el Objetivo',
                    severity: deviation > 0.1 ? 'WARNING' : 'INFO',
                    description: `El margen actual (${(marginPct * 100).toFixed(1)}%) es inferior al objetivo (${(targetMargin * 100).toFixed(0)}%).`
                });
                if (deviation > 0.1) {
                    recommendations.push("Negociar mejores precios con proveedores o aumentar valor de venta.");
                    scoreDeduction += 20;
                }
            }
        } else if (totalCosts > 0) {
            issues.push({
                title: 'Costos sin Venta Registrada',
                severity: 'WARNING',
                description: "Hay costos asociados pero no hay ítems cotizados (Venta = 0). Esto genera pérdida técnica."
            });
            recommendations.push("Asegúrese de ingresar los ítems de venta (Cotización) para calcular la rentabilidad real.");
            scoreDeduction += 30;
        }

        // RULE 3: Project Status vs Activity
        const daysSinceUpdate = (new Date().getTime() - new Date(project.updatedAt).getTime()) / (1000 * 3600 * 24);
        if (project.status === 'EN_CURSO' && daysSinceUpdate > 15) {
            issues.push({
                title: 'Proyecto Inactivo',
                severity: 'INFO',
                description: "No se han registrado actualizaciones en más de 15 días para un proyecto en curso."
            });
            scoreDeduction += 10;
        }

        // 4. Calculate Final Score & Summary
        const finalScore = Math.max(0, 100 - scoreDeduction);

        let sentiment: AuditResult['sentiment'] = 'NEUTRAL';
        if (finalScore >= 80) sentiment = 'POSITIVE';
        else if (finalScore <= 50) sentiment = 'NEGATIVE';

        let summary = "";
        if (finalScore === 100) {
            summary = "Salud financiera impecable. Costos bajo control y márgenes óptimos.";
        } else if (finalScore >= 80) {
            summary = "Estado financiero saludable, con desviaciones menores controladas.";
        } else if (finalScore >= 50) {
            summary = "Riesgos financieros detectados que requieren atención administrativa.";
        } else {
            summary = "Estado crítico. Desvíos presupuestarios graves requieren intervención inmediata.";
        }

        if (issues.length === 0) {
            recommendations.push("Mantener el monitoreo periódico de costos.");
            recommendations.push("Registrar avances regularmente en la bitácora.");
        }

        console.log(`[Audit][${traceId}] Audit completed. Score: ${finalScore}`);

        return {
            healthScore: finalScore,
            summary,
            issues,
            recommendations,
            sentiment
        };

    } catch (error: any) {
        console.error(`[Audit][${traceId}] FATAL ERROR:`, error.message);
        throw new Error("Fallo en el motor de auditoría financiera. Trace: " + traceId);
    }
}
