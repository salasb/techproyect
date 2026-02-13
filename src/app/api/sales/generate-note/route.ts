import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import prisma from "@/lib/prisma"; // Assuming you have a prisma client instance

export async function POST(req: Request) {
    const { projectId } = await req.json();

    if (!projectId) {
        return Response.json({ error: 'Project ID is required' }, { status: 400 });
    }

    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch { }
                    },
                },
            }
        );

        // Check Auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
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
