import { Database } from '@/types/supabase';
import { calculateProjectFinancials, MinimalProject, MinimalCostEntry, MinimalInvoice } from './financialCalculator';
import { differenceInCalendarDays } from 'date-fns';

type Project = Database['public']['Tables']['Project']['Row'] & {
    costEntries: Database['public']['Tables']['CostEntry']['Row'][];
    invoices: Database['public']['Tables']['Invoice']['Row'][];
    quoteItems: Database['public']['Tables']['QuoteItem']['Row'][];
    company?: { name: string } | null; // Optional context
};

type Settings = Database['public']['Tables']['Settings']['Row'];

export interface RiskAnalysis {
    score: number; // 0 - 100
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    factors: string[];
    details: {
        spi: number; // Schedule Performance Index
        cpi: number; // Cost Performance Index
        liquidityRisk: number; // % of overdue invoices
    };
    context: string; // Human-readable explanation
}

export class RiskEngine {
    static calculateProjectRisk(project: Project, settings: Settings): RiskAnalysis {
        const factors: string[] = [];
        let score = 0;

        // 0. Basics
        if (project.status === 'CANCELADO' || project.status === 'CERRADO' || project.status === 'BLOQUEADO') {
            return {
                score: 0,
                level: 'LOW',
                factors: ['Proyecto inactivo o finalizado'],
                details: { spi: 1, cpi: 1, liquidityRisk: 0 },
                context: "El proyecto se encuentra inactivo, por lo que no requiere análisis de riesgo activo."
            };
        }

        const now = new Date();
        const start = new Date(project.startDate);
        const end = new Date(project.plannedEndDate); // Assumes valid date, handled below

        // 1. Schedule Risk (SPI Proxy)
        // Time Elapsed %
        let timeElapsedPct = 0;
        const totalDuration = differenceInCalendarDays(end, start);
        const elapsedDuration = differenceInCalendarDays(now, start);

        if (totalDuration > 0) {
            timeElapsedPct = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
        }

        // Logic: Compare Progress vs Time Elapsed
        // If Time Elapsed (e.g. 50%) >> Progress (e.g. 10%), High Risk.
        // SPI = EV / PV (Earned / Planned). Here: Progress / TimeElapsed.

        let spi = 1;
        if (timeElapsedPct > 0) {
            spi = project.progress / timeElapsedPct;
        }

        if (spi < 0.8) { // Posterior a 20% de desviación
            score += 30;
            factors.push(`Retraso Crítico: Cronograma al ${timeElapsedPct.toFixed(0)}% pero avance al ${project.progress}%`);
        } else if (spi < 0.95) {
            score += 15;
            factors.push(`Desviación leve de cronograma (SPI: ${spi.toFixed(2)})`);
        } else if (elapsedDuration > totalDuration && project.progress < 100) {
            score += 40;
            factors.push('Proyecto fuera de plazo (Overdue)');
        }


        // 2. Cost Risk (CPI Proxy)
        const financials = calculateProjectFinancials(
            project,
            project.costEntries,
            project.invoices,
            settings,
            project.quoteItems
        );

        // Budget Consumed %
        // Use baseCostNet (Budget) vs totalExecutedCostNet (Actuals)
        let budgetConsumedPct = 0;
        if (financials.baseCostNet > 0) {
            budgetConsumedPct = (financials.totalExecutedCostNet / financials.baseCostNet) * 100;
        }

        // CPI = EV / AC (Earned / Actual Cost). 
        // EV (Value Earned) = Budget * Progress%
        // AC (Actual Cost) = totalExecutedCostNet
        // Or simpler: Compare Progress vs Budget Consumed.
        // If Budget Consumed (50%) >> Progress (10%), BAD. Means we are spending fast but doing little.

        let cpi = 1;
        if (budgetConsumedPct > 0) {
            // Normalized to progress. If I spent 50% of budget, I should have 50% progress (ideally).
            cpi = project.progress / budgetConsumedPct;
        }

        if (cpi < 0.8 && budgetConsumedPct > 10) { // Ignore early deviations
            score += 30;
            factors.push(`Ineficiencia de Costos: ${budgetConsumedPct.toFixed(0)}% del ppt gastado con solo ${project.progress}% avance`);
        } else if (financials.marginAmountNet < 0) {
            score += 40; // High impact
            factors.push('Proyecto con Margen Negativo (Pérdidas)');
        } else if (financials.marginAmountNet < (financials.priceNet * 0.15)) {
            score += 10;
            factors.push('Margen peligrosamente bajo (<15%)');
        }


        // 3. Liquidity Risk (Collection)
        // Ratio of Overdue Invoices
        let totalOverdue = 0;
        let totalInvoiced = 0;

        project.invoices.forEach(inv => {
            if (inv.sent) {
                totalInvoiced += inv.amountInvoicedGross;
                if (!inv.amountPaidGross) { // Not fully paid
                    let dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
                    if (!dueDate && inv.sentDate) {
                        const terms = inv.paymentTermsDays ?? settings.defaultPaymentTermsDays;
                        dueDate = new Date(inv.sentDate);
                        dueDate.setDate(dueDate.getDate() + terms);
                    }

                    if (dueDate && dueDate < now) {
                        totalOverdue += (inv.amountInvoicedGross - inv.amountPaidGross);
                    }
                }
            }
        });

        let liquidityRisk = 0;
        if (totalInvoiced > 0) {
            liquidityRisk = totalOverdue / totalInvoiced;
        }

        if (liquidityRisk > 0.3) { // > 30% overdue
            score += 25;
            factors.push('Alto riesgo de liquidez (>30% facturación vencida)');
        } else if (liquidityRisk > 0) {
            score += 10;
            factors.push('Existen facturas vencidas pendientes');
        }

        // 4. Cap Score
        score = Math.min(100, Math.max(0, score));

        // 5. Determine Level
        let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        if (score > 70) level = 'HIGH';
        else if (score > 30) level = 'MEDIUM';

        // 6. Generate Human Context
        let context = "El proyecto muestra un desempeño saludable en plazos y costos.";

        if (score === 0) {
            context = "El proyecto avanza impecablemente, sin alertas de riesgo detectadas.";
        } else if (level === 'HIGH') {
            if (liquidityRisk > 0.3) {
                context = "Situación crítica financiera: La alta morosidad está comprometiendo la liquidez, sumado a otros factores de riesgo.";
            } else if (spi < 0.8) {
                context = "Retraso grave detectado: El cronograma se ha desviado significativamente y requiere un plan de recuperación inmediato.";
            } else if (cpi < 0.8) {
                context = "Alerta de rentabilidad: Los costos están aumentando mucho más rápido que el avance físico del proyecto.";
            } else {
                context = "El proyecto se encuentra en estado crítico debido a la acumulación de múltiples factores de riesgo.";
            }
        } else if (level === 'MEDIUM') {
            if (spi < 0.95 && cpi < 0.95) {
                context = "Atención requerida: Se observan desviaciones leves tanto en plazos como en costos que podrían agravarse.";
            } else if (spi < 0.95) {
                context = "El proyecto avanza más lento de lo planificado. Se sugiere revisar la asignación de recursos.";
            } else if (cpi < 0.9) {
                context = "Eficiencia de costos reducida. Revise gastos recientes para evitar afectar el margen.";
            } else if (liquidityRisk > 0) {
                context = "Gestión de cobro necesaria: Existen facturas vencidas que afectan el flujo de caja.";
            }
        }

        return {
            score,
            level,
            factors,
            details: {
                spi,
                cpi,
                liquidityRisk
            },
            context
        };
    }
}
