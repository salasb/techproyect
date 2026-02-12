import { Database } from '@/types/supabase'
import { addDays, differenceInCalendarDays, isAfter, isBefore, startOfDay } from 'date-fns'

// Decoupled interface to accept both Prisma (Date) and Supabase (string) types
// and ignore unused fields like 'description'
export interface MinimalProject {
    budgetNet: number
    marginPct: number
    status: string | null
    progress: number
    plannedEndDate: string | Date | null
}

// Decoupled CostEntry to tolerate Date vs String
export interface MinimalCostEntry {
    amountNet: number
    date: Date | string
    description?: string // Make optional if irrelevant
}

// Decoupled Invoice
export interface MinimalInvoice {
    amountInvoicedGross: number
    amountPaidGross: number
    sent: boolean
    sentDate: Date | string | null
    dueDate: Date | string | null
    paymentTermsDays: number | null
}

type Settings = Database['public']['Tables']['Settings']['Row']

export interface FinancialResult {
    sumCostNet: number
    baseCostNet: number
    marginAmountNet: number
    priceNet: number
    vatAmount: number
    priceGross: number
    totalInvoicedGross: number
    totalPaidGross: number
    pendingToInvoiceGross: number
    receivableGross: number
    trafficLightTime: 'GRAY' | 'GREEN' | 'YELLOW' | 'RED'
    trafficLightCollection: 'GRAY' | 'GREEN' | 'YELLOW' | 'RED'
    trafficLightFinancial: 'GRAY' | 'GREEN' | 'YELLOW' | 'RED'
    totalExecutedCostNet: number
    calculatedProgress: number
    marginPct: number
    overallHealth: 'GRAY' | 'GREEN' | 'YELLOW' | 'RED'
}

type QuoteItem = Database['public']['Tables']['QuoteItem']['Row'] & { isSelected?: boolean }

export function calculateProjectFinancials(
    project: MinimalProject,
    costs: MinimalCostEntry[],
    invoices: MinimalInvoice[],
    settings: Settings,
    quoteItems: QuoteItem[] = [],
    today: Date = new Date()
): FinancialResult {
    // 1. Costs
    const sumCostNet = costs.reduce((acc, c) => acc + c.amountNet, 0)
    let baseCostNet = sumCostNet > 0 ? sumCostNet : project.budgetNet

    // 2. Price Logic
    let priceNet = 0
    let marginAmountNet = 0

    // If we have detailed quote items, they dictate the Price AND "Budget" Cost (Bottom-Up).
    if (quoteItems && quoteItems.length > 0) {
        // Filter only selected items for calculation
        const activeItems = quoteItems.filter(item => item.isSelected !== false); // Default to true if null/undefined

        priceNet = activeItems.reduce((acc, item) => acc + (item.priceNet * item.quantity), 0)

        const itemsCostNet = activeItems.reduce((acc, item) => acc + (item.costNet * item.quantity), 0)

        // Base Cost (Budget) is derived from the Quote Items
        baseCostNet = itemsCostNet

        // Margin becomes derived: Price - Base Cost
        marginAmountNet = priceNet - baseCostNet
    } else {
        // Fallback to Cost + Margin model
        marginAmountNet = baseCostNet * project.marginPct
        priceNet = baseCostNet + marginAmountNet
    }

    const vatRate = settings.vatRate
    const vatAmount = priceNet * vatRate
    const priceGross = priceNet + vatAmount

    // 3. Invoices
    const sentInvoices = invoices.filter((i) => i.sent)
    const totalInvoicedGross = sentInvoices.reduce((acc, i) => acc + i.amountInvoicedGross, 0)
    const totalPaidGross = invoices.reduce((acc, i) => acc + i.amountPaidGross, 0)

    const pendingToInvoiceGross = priceGross - totalInvoicedGross
    const receivableGross = totalInvoicedGross - totalPaidGross

    // 4. Semáforos (Traffic Lights)
    const trafficLightTime = calculateTimeTrafficLight(project, settings, today)
    const trafficLightCollection = calculateCollectionTrafficLight(sentInvoices, receivableGross, settings, today)

    // 5. Financial Progress (Executed Cost / Base Cost)
    // Avoid division by zero
    const calculatedProgress = baseCostNet > 0 ? Math.min(100, (sumCostNet / baseCostNet) * 100) : 0;

    // 6. Semáforo Financiero (Financial Traffic Light)
    // Red: < 0% Margin (Loss)
    // Yellow: < 20% Margin (Low profit / Risk)
    // Green: >= 20% Margin (Healthy)

    // We must use ACTUAL execution to determine health, not just the plan.
    // Actual Margin = Price - Total Executed Cost
    let usefulMarginAmount = marginAmountNet;

    // If we have a price (Fixed Price / Quote model), we check against actual costs.
    if (priceNet > 0) {
        usefulMarginAmount = priceNet - sumCostNet;
    }
    // If it's pure Cost Plus with no fixed price, margin is just a markup on cost, so it theoretically stays constant %,
    // unless we exceeded some budget cap (but budget cap isn't strictly enforced in cost-plus usually).
    // For now, let's assume if priceNet > 0 we use actuals.

    const projectedMarginPct = priceNet > 0 ? (marginAmountNet / priceNet) * 100 : 0;
    const actualMarginPct = priceNet > 0 ? (usefulMarginAmount / priceNet) * 100 : 0;

    // Use the worst-case margin for the traffic light to be conservative
    const marginPct = Math.min(projectedMarginPct, actualMarginPct);

    let trafficLightFinancial: 'GRAY' | 'GREEN' | 'YELLOW' | 'RED' = 'GRAY';

    if (priceNet === 0 && baseCostNet === 0 && sumCostNet === 0) {
        trafficLightFinancial = 'GRAY'; // No activity
    } else if (marginPct <= 5) {
        trafficLightFinancial = 'RED'; // 0-5% is Critical
    } else if (marginPct <= 15) {
        trafficLightFinancial = 'YELLOW'; // 6-15% is Warning
    } else {
        trafficLightFinancial = 'GREEN'; // > 15% is Healthy
    }

    // 7. Overall Health (Health Traffic Light)
    // RED if any sub-traffic light is RED.
    // YELLOW if any is YELLOW (and none RED).
    // GREEN otherwise.
    let overallHealth: 'GRAY' | 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';

    if (trafficLightTime === 'RED' || trafficLightCollection === 'RED' || trafficLightFinancial === 'RED') {
        overallHealth = 'RED';
    } else if (trafficLightTime === 'YELLOW' || trafficLightCollection === 'YELLOW' || trafficLightFinancial === 'YELLOW') {
        overallHealth = 'YELLOW';
    } else if (trafficLightTime === 'GRAY' && trafficLightCollection === 'GRAY' && trafficLightFinancial === 'GRAY') {
        overallHealth = 'GRAY';
    }

    return {
        sumCostNet, // Keeping for backward compat if needed, but redundant with totalExecutedCostNet logic-wise
        baseCostNet,
        marginAmountNet,
        priceNet,
        vatAmount,
        priceGross,
        totalInvoicedGross,
        totalPaidGross,
        pendingToInvoiceGross,
        receivableGross,
        trafficLightTime,
        trafficLightCollection,
        trafficLightFinancial, // New
        totalExecutedCostNet: sumCostNet,
        calculatedProgress, // New field
        marginPct,
        overallHealth
    }
}

function calculateTimeTrafficLight(
    project: MinimalProject,
    settings: Settings,
    today: Date
): 'GRAY' | 'GREEN' | 'YELLOW' | 'RED' {
    if (project.status === 'CANCELADO') return 'GRAY'
    // CERRADO no está en los tipos literales de Supabase generados todavía si usamos strings directos, pero asumiendo compatibilidad
    if (project.progress === 100 || project.status === 'CERRADO') return 'GREEN'

    // ...
    // ...
    const todayStart = startOfDay(today)

    // Validate plannedEndDate
    if (!project.plannedEndDate) return 'GREEN' // o manejo por defecto
    const endDate = new Date(project.plannedEndDate);
    if (isNaN(endDate.getTime())) return 'GRAY'; // Invalid date

    const plannedEndStart = startOfDay(endDate)

    // Rojo: plannedEndDate < hoy y progress < 100
    if (isBefore(plannedEndStart, todayStart) && project.progress < 100) return 'RED'

    // Amarillo: plannedEndDate dentro de yellowThresholdDays y progress < 100
    // "dentro de" implies: today <= plannedEnd <= today + threshold
    // Or implies: plannedEnd - today <= threshold.
    const daysUntilEnd = differenceInCalendarDays(plannedEndStart, todayStart)
    if (daysUntilEnd >= 0 && daysUntilEnd <= settings.yellowThresholdDays && project.progress < 100) {
        return 'YELLOW'
    }

    // Verde: resto
    return 'GREEN'
}

function calculateCollectionTrafficLight(
    sentInvoices: MinimalInvoice[],
    receivableGross: number,
    settings: Settings,
    today: Date
): 'GRAY' | 'GREEN' | 'YELLOW' | 'RED' {
    if (sentInvoices.length === 0) return 'GRAY'
    if (receivableGross <= 0) return 'GREEN' // Todo pagado o nada pendiente real

    // Rojo: existe invoice enviada con dueDate < hoy y receivableGross > 0
    // Amarillo: dueDate dentro de yellowThresholdDays y receivableGross > 0

    // Need to compute effective due dates for checks
    const todayStart = startOfDay(today)
    let hasRed = false
    let hasYellow = false

    for (const inv of sentInvoices) {
        // If inv is fully paid? The requirement says "receivableGross > 0" globally (as the condition for the light).
        // But does it check PER invoice? "existe invoice enviada con dueDate...".
        // Yes. It checks existence of AT LEAST ONE invoice meeting criteria.

        // Compute Due Date
        let dueDate: Date | null = null

        if (inv.dueDate) {
            const d = new Date(inv.dueDate);
            if (!isNaN(d.getTime())) dueDate = d;
        }

        if (!dueDate && inv.sentDate) {
            const d = new Date(inv.sentDate);
            if (!isNaN(d.getTime())) {
                const terms = inv.paymentTermsDays ?? settings.defaultPaymentTermsDays
                dueDate = addDays(d, terms)
            }
        }

        if (!dueDate) continue // Should not happen if sentDate exists and is valid

        const dueDateStart = startOfDay(dueDate)

        if (isBefore(dueDateStart, todayStart)) {
            hasRed = true
        } else {
            const daysUntilDue = differenceInCalendarDays(dueDateStart, todayStart)
            if (daysUntilDue >= 0 && daysUntilDue <= settings.yellowThresholdDays) {
                hasYellow = true
            }
        }
    }

    if (hasRed) return 'RED'
    if (hasYellow) return 'YELLOW'

    return 'GREEN'
}
