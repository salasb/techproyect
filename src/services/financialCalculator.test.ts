import { describe, it, expect } from 'vitest'
import { calculateProjectFinancials } from './financialCalculator'
import { Project, CostEntry, Invoice, Settings, ProjectStatus, ProjectStage } from '@prisma/client'

// Mocks
const mockSettings: Settings = {
    id: 1,
    currency: 'CLP',
    vatRate: 0.19,
    defaultPaymentTermsDays: 30,
    yellowThresholdDays: 7,
}

const mockProject: Project = {
    id: 'PRJ-001',
    companyId: 'C1',
    name: 'Demo Project',
    responsible: 'Dev',
    status: 'EN_CURSO',
    stage: 'DESARROLLO',
    progress: 50,
    startDate: new Date('2024-01-01'),
    plannedEndDate: new Date('2024-02-01'),
    nextAction: null,
    budgetNet: 1000,
    marginPct: 0.30,
    createdAt: new Date(),
    updatedAt: new Date(),
}

describe('calculateProjectFinancials', () => {
    it('should use budgetNet when no costs exist', () => {
        const result = calculateProjectFinancials(mockProject, [], [], mockSettings)

        // Base = 1000
        // Margin = 300
        // PriceNet = 1300
        // VAT = 1300 * 0.19 = 247
        // PriceGross = 1547

        expect(result.sumCostNet).toBe(0)
        expect(result.baseCostNet).toBe(1000)
        expect(result.marginAmountNet).toBe(300)
        expect(result.priceNet).toBe(1300)
        expect(result.vatAmount).toBe(247)
        expect(result.priceGross).toBe(1547)
    })

    it('should use sumCostNet when costs exist', () => {
        const costs: CostEntry[] = [
            { id: '1', projectId: 'PRJ-001', date: new Date(), category: 'SERVICIOS', description: 'Dev', amountNet: 2000 }
        ]
        const result = calculateProjectFinancials(mockProject, costs, [], mockSettings)

        // Base = 2000
        // Margin = 600
        // PriceNet = 2600
        // VAT = 2600 * 0.19 = 494
        expect(result.baseCostNet).toBe(2000)
        expect(result.priceGross).toBe(3094)
    })

    it('should calculate invoicing totals correctly', () => {
        const invoices: Invoice[] = [
            { id: '1', projectId: 'PRJ-001', sent: true, sentDate: new Date(), paymentTermsDays: 30, dueDate: null, amountInvoicedGross: 1000, amountPaidGross: 500, updatedAt: new Date() },
            { id: '2', projectId: 'PRJ-001', sent: false, sentDate: null, paymentTermsDays: null, dueDate: null, amountInvoicedGross: 2000, amountPaidGross: 0, updatedAt: new Date() } // Not sent yet
        ]

        // Use budget logic (Base 1000 -> PriceGross 1547)
        const result = calculateProjectFinancials(mockProject, [], invoices, mockSettings)

        expect(result.totalInvoicedGross).toBe(1000) // Only sent one
        expect(result.totalPaidGross).toBe(500)
        expect(result.receivableGross).toBe(500) // 1000 - 500
        expect(result.pendingToInvoiceGross).toBe(1547 - 1000) // 547
    })

    // Semáforos Tests
    describe('Traffic Light: Time', () => {
        it('should be GREEN if closed', () => {
            const p = { ...mockProject, status: 'CERRADO' as ProjectStatus }
            const res = calculateProjectFinancials(p, [], [], mockSettings)
            expect(res.trafficLightTime).toBe('GREEN')
        })

        it('should be RED if overdue and not complete', () => {
            // Planned End: 2024-02-01
            // Today: 2024-02-02
            const today = new Date('2024-02-02')
            const res = calculateProjectFinancials(mockProject, [], [], mockSettings, today)
            expect(res.trafficLightTime).toBe('RED')
        })

        it('should be YELLOW if close to deadline', () => {
            // Planned End: 2024-02-01
            // Today: 2024-01-30 (2 days diff, threshold 7)
            const today = new Date('2024-01-30')
            const res = calculateProjectFinancials(mockProject, [], [], mockSettings, today)
            expect(res.trafficLightTime).toBe('YELLOW')
        })
    })

    describe('Traffic Light: Collection', () => {
        it('should be GRAY if no sent invoices', () => {
            const res = calculateProjectFinancials(mockProject, [], [], mockSettings)
            expect(res.trafficLightCollection).toBe('GRAY')
        })

        it('should be GREEN if receivable is 0', () => {
            // Invoice sent but fully paid
            const inv: Invoice = { ...invoicesBase, sent: true, amountInvoicedGross: 1000, amountPaidGross: 1000 }
            const res = calculateProjectFinancials(mockProject, [], [inv], mockSettings)
            expect(res.trafficLightCollection).toBe('GREEN')
        })

        it('should be RED if overdue invoice exists', () => {
            const today = new Date('2024-03-01')
            // Sent Jan 1st, Terms 30 days -> Due Jan 31st.
            // Today Mar 1st -> Overdue.
            const inv: Invoice = { ...invoicesBase, sent: true, sentDate: new Date('2024-01-01'), paymentTermsDays: 30, amountInvoicedGross: 1000, amountPaidGross: 0 }
            const res = calculateProjectFinancials(mockProject, [], [inv], mockSettings, today)
            expect(res.trafficLightCollection).toBe('RED')
        })
    })
})

const invoicesBase: Invoice = {
    id: '1', projectId: 'PRJ-001', sent: false, sentDate: null, paymentTermsDays: null, dueDate: null, amountInvoicedGross: 0, amountPaidGross: 0, updatedAt: new Date()
}
