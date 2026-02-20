import { requireOperationalScope } from '@/lib/auth/server-resolver';
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    const { projectId } = await req.json();

    if (!projectId) {
        return Response.json({ error: 'Project ID is required' }, { status: 400 });
    }

    try {
        // Enforce Multi-Org Scope Isolation
        const scope = await requireOperationalScope();

        // Ensure projectId belongs to the operating organization
        const projectVerification = await prisma.project.findUnique({
            where: { id: projectId },
            select: { organizationId: true }
        });

        if (!projectVerification || projectVerification.organizationId !== scope.orgId) {
            return Response.json({ error: 'Project not found or outside active scope' }, { status: 403 });
        }

        // Check if note already exists
        const existingNote = await prisma.saleNote.findUnique({
            where: { projectId },
            include: { project: { include: { company: true, quoteItems: true } } }
        });

        if (existingNote) {
            return Response.json(existingNote);
        }

        // Create new note
        // Note: 'correlative' is autoincrement, so we don't send it manually
        const newNote = await prisma.saleNote.create({
            data: {
                projectId,
                status: 'ISSUED'
            },
            include: {
                project: {
                    include: {
                        company: true,
                        quoteItems: true
                    }
                }
            }
        });

        return Response.json(newNote);

    } catch (error: any) {
        console.error("Scale Note Generation Error", error);
        return Response.json({
            error: 'Failed to generate Sale Note',
            details: error.message
        }, { status: 500 });
    }
}
