import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    // Removed security check locally

    try {
        const profiles = await prisma.profile.findMany();
        const orgs = await prisma.organization.findMany();
        const projects = await prisma.project.findMany();

        return NextResponse.json({
            databaseUrlExcerpt: process.env.DATABASE_URL?.substring(0, 30) + "...",
            counts: {
                profiles: profiles.length,
                orgs: orgs.length,
                projects: projects.length
            },
            profiles,
            orgs,
            projects
        });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to run forensics", details: error.message }, { status: 500 });
    }
}
