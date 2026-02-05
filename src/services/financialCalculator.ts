import { Database } from '@/types/supabase'
import { addDays, differenceInCalendarDays, isAfter, isBefore, startOfDay } from 'date-fns'

// Decoupled interface to accept both Prisma (Date) and Supabase (string) types
// and ignore unused fields like 'description'
interface MinimalProject {
    budgetNet: number
    marginPct: number
    status: string | null
    progress: number
    plannedEndDate: string | Date | null
}

type CostEntry = Database['public']['Tables']['CostEntry']['Row']
type Invoice = Database['public']['Tables']['Invoice']['Row']
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
}

type QuoteItem = Database['public']['Tables']['QuoteItem']['Row']

export function calculateProjectFinancials(
    project: MinimalProject,
    costs: CostEntry[],
    invoices: Invoice[],
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

    // If we have detailed quote items, they dictate the Price AND Cost (Bottom-Up).
    if (quoteItems && quoteItems.length > 0) {
        priceNet = quoteItems.reduce((acc, item) => acc + (item.priceNet * item.quantity), 0)

        const itemsCostNet = quoteItems.reduce((acc, item) => acc + (item.costNet * item.quantity), 0)
        // If items have cost, we use that. If not (legacy items), we might have 0 cost which gives 100% margin. 
        // We assume the user wants this new logic.

        // However, we also have "costEntries" (Realized costs).
        // Usually "Base Cost" in a quote context implies "Projected Cost".
        // If we want to show "Projected Margin", we should use itemsCostNet.

        baseCostNet = itemsCostNet > 0 ? itemsCostNet : baseCostNet // Fallback to budget if items have no cost? Or just 0?
        // Let's stick to the plan: Item Costs take precedence.
        baseCostNet = itemsCostNet

        // Margin becomes derived: Price - Cost
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

    return {
        sumCostNet,
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

    const todayStart = startOfDay(today)
    // Supabase devuelve fechas como string ISO
    if (!project.plannedEndDate) return 'GREEN' // o manejo por defecto
    const plannedEndStart = startOfDay(new Date(project.plannedEndDate))

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
    sentInvoices: Invoice[],
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
        let dueDate: Date | null = inv.dueDate ? new Date(inv.dueDate) : null

        if (!dueDate && inv.sentDate) {
            const terms = inv.paymentTermsDays ?? settings.defaultPaymentTermsDays
            dueDate = addDays(new Date(inv.sentDate), terms)
        }

        if (!dueDate) continue // Should not happen if sentDate exists

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
