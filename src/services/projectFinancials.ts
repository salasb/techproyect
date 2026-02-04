import prisma from '@/lib/prisma'
import { calculateProjectFinancials, FinancialResult } from './financialCalculator'
import { notFound } from 'next/navigation'

export async function getProjectFinancials(projectId: string): Promise<FinancialResult> {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
    })

    if (!project) {
        throw new Error(`Project ${projectId} not found`)
    }

    const [costs, invoices, settings] = await Promise.all([
        prisma.costEntry.findMany({ where: { projectId } }),
        prisma.invoice.findMany({ where: { projectId } }),
        prisma.settings.findFirst(), // Assuming single row
    ])

    if (!settings) {
        throw new Error("Settings not initialized")
    }

    return calculateProjectFinancials(project, costs, invoices, settings)
}
