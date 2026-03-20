import { Project, CostEntry, Invoice, QuoteItem, Settings } from "@prisma/client";
import { calculateProjectFinancials, FinancialResult } from "./financialCalculator";

/**
 * FINANCIAL DOMAIN SERVICE (v1.0)
 * The single source of truth for all money-related calculations in TechProyect.
 * Unifies Dashboard, Reports, and Project views.
 */

// Strict interfaces to eliminate 'any' usage
export interface ProjectFinancialContext extends Project {
    costEntries?: CostEntry[];
    invoices?: Invoice[];
    quoteItems?: QuoteItem[];
}

export interface DashboardFinancials {
    totalRevenue: number;
    totalMargin: number;
    totalCosts: number;
    avgMarginPct: number;
    activeProjectsCount: number;
    pendingQuotesCount: number;
    totalInvoiced: number;
    totalPaid: number;
    receivable: number;
}

export class FinancialDomain {
    /**
     * Calculates absolute totals for a single project.
     * Use this instead of calling the calculator directly from UI.
     */
    static getProjectSnapshot(project: ProjectFinancialContext, settings: Settings): FinancialResult {
        return calculateProjectFinancials(
            {
                budgetNet: project.budgetNet || 0,
                marginPct: project.marginPct || 0.3,
                status: project.status,
                progress: project.progress || 0,
                plannedEndDate: project.plannedEndDate
            },
            project.costEntries || [],
            project.invoices || [],
            {
                vatRate: settings.vatRate,
                yellowThresholdDays: settings.yellowThresholdDays,
                defaultPaymentTermsDays: settings.defaultPaymentTermsDays
            },
            project.quoteItems || []
        );
    }

    /**
     * Aggregates financials for a collection of projects.
     * Centralizes the logic used in Dashboard and Reports.
     */
    static aggregateCollection(projects: ProjectFinancialContext[], settings: Settings): DashboardFinancials {
        const snapshots = projects.map(p => this.getProjectSnapshot(p, settings));

        const totalRevenue = snapshots.reduce((acc, s) => acc + s.priceNet, 0);
        const totalMargin = snapshots.reduce((acc, s) => acc + s.marginAmountNet, 0);
        const totalCosts = snapshots.reduce((acc, s) => acc + s.totalExecutedCostNet, 0);
        const totalInvoiced = snapshots.reduce((acc, s) => acc + s.totalInvoicedGross, 0);
        const totalPaid = snapshots.reduce((acc, s) => acc + s.totalPaidGross, 0);

        // Logic for business states (Aligned with OLA A requirements)
        const activeProjectsCount = projects.filter(p => 
            ['EN_CURSO', 'EN_ESPERA', 'BLOQUEADO'].includes(p.status || '')
        ).length;

        const pendingQuotesCount = projects.filter(p => 
            p.quoteSentDate && !p.acceptedAt
        ).length;

        return {
            totalRevenue,
            totalMargin,
            totalCosts,
            avgMarginPct: totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0,
            activeProjectsCount,
            pendingQuotesCount,
            totalInvoiced,
            totalPaid,
            receivable: totalInvoiced - totalPaid
        };
    }

    /**
     * Common currency formatter to avoid local divergence.
     */
    static formatCurrency(amount: number, currency: string = 'CLP'): string {
        if (currency === 'CLP') {
            return new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                maximumFractionDigits: 0
            }).format(amount);
        }
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount);
    }
}
