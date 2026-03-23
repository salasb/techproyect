import prisma from '@/lib/prisma'
import { FinancialDomain } from './financialDomain'
import { notFound } from 'next/navigation'

export async function getProjectFinancials(projectId: string) {
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

    const fullProject = { ...project, costEntries: costs, invoices, quoteItems: [] };
    return FinancialDomain.getProjectSnapshot(fullProject as any, settings as any)
}
